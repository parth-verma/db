import {
  ColumnDef,
  flexRender,
  getCoreRowModel, RowData, type Table as DTable, type Row as DRow,
  useReactTable,
} from "@tanstack/react-table";
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual'
import React, {MouseEvent, useRef} from "react";
import { columns } from "../../bindings/changeme/internal";
import {clsx} from "clsx";

// Define a type for our dynamic row data
type DynamicRow = Record<string, string>;

// Default empty data
const defaultData: DynamicRow[] = [];

export function Table({
                        columnInfo = [] as columns[],
                        rowData = [] as string[][]
                      }){
  const processedData = React.useMemo(() => {
    if (!columnInfo.length || !rowData.length) return defaultData;

    return rowData.map((row) => {
      const rowObj: DynamicRow = {};
      columnInfo.forEach((col, index) => {
        // Use column name as the key and row value as the value
        rowObj[col.Name] = row[index];
      });
      return rowObj;
    });
  }, [columnInfo, rowData]);

  // Dynamically create columns based on the column info
  const columns = React.useMemo(() => {
    if (!columnInfo.length) return [];

    return columnInfo.map((col): ColumnDef<unknown> => ({
      accessorKey: col.Name,
      header: () => (
        <div className="flex flex-col">
          <span>{col.Name}</span>
          <span className="text-[11px] leading-tight text-muted-foreground">{col.Type}</span>
        </div>
      ),
      minSize: col.Name.length * 7 + 24,
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
      meta: {
        type: col.Type,
      },
    }));
  }, [columnInfo]);

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  return <TableCore table={table}/>;
}

function TableCore({
  table
}: {table: DTable<RowData>}) {
  // Convert the 2D array of strings to an array of objects
  // where each object represents a row with column names as keys
  const tableContainerRef = useRef<HTMLDivElement>(null)


  const onMouseDown = (handler: React.EventHandler<MouseEvent>) => {
    return (e: MouseEvent<HTMLSpanElement>) => {
      handler(e);
      if (!tableContainerRef.current) return;
      tableContainerRef.current.classList.add('cursor-col-resize','select-none');

      window.addEventListener('mouseup', () => {
        if (!tableContainerRef.current) return;
        tableContainerRef.current.classList.remove('cursor-col-resize', 'select-none');
      }, {once: true})
    }
  }

  const columnTemplate = table.getAllColumns().slice(0,-1).map(col => col.getSize()+'px').join(' ') + ' 1fr';

  return (
    <div className="min-w-full overflow-auto max-h-full relative" ref={tableContainerRef}>
      <table className={"min-w-full grid relative"}  >
        <thead className="bg-secondary top-0 z-10 sticky ">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}  className={"grid w-full"} style={{gridTemplateColumns: columnTemplate}}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={clsx("bg-secondary px-3 py-2 text-left text-sm font-medium text-secondary-foreground border-b border-border relative")}
                  style={{width: index === headerGroup.headers.length-1 ? '':   header.getSize()}}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {index !== headerGroup.headers.length-1 && header.column.getCanResize() && (
                      <span
                          onMouseDown={onMouseDown(header.getResizeHandler())}
                          onTouchStart={header.getResizeHandler()}
                          className={'cursor-col-resize h-5 px-2 touch-none select-none absolute top-2/4 -right-2.5 transform -translate-y-1/2 z-10'}
                      >
                        <div className={'w-0.5 h-full bg-border'}></div>
                      </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <TableBody table={table} tableContainerRef={tableContainerRef}  />
      </table>
    </div>
  );
}

interface TableBodyProps {
  table: DTable<RowData>
  tableContainerRef: React.RefObject<HTMLDivElement>
}

function TableBody({ table, tableContainerRef }: TableBodyProps) {
  const { rows } = table.getRowModel()

  // Important: Keep the row virtualizer in the lowest component possible to avoid unnecessary re-renders.
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
        typeof window !== 'undefined' &&
        navigator.userAgent.indexOf('Firefox') === -1
            ? element => element?.getBoundingClientRect().height
            : undefined,
    overscan: 5,
  })

  return (
      <tbody
          className="divide-y divide-border relative min-w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
          }}
      >
      {rowVirtualizer.getVirtualItems().map(virtualRow => {
        const row = rows[virtualRow.index] as DRow<RowData>
        return (
            <TableBodyRow
                key={row.id}
                row={row}
                virtualRow={virtualRow}
                rowVirtualizer={rowVirtualizer}
            />
        )
      })}</tbody>
  )
}

interface TableBodyRowProps {
  row: DRow<RowData>
  virtualRow: VirtualItem
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>
}

function TableBodyRow({ row, virtualRow, rowVirtualizer }: TableBodyRowProps) {
  const columnTemplate = row.getVisibleCells().slice(0,-1).map(cell => cell.column.getSize()+'px').join(' ') + ' 1fr';

  return (
      <tr
          data-index={virtualRow.index} //needed for dynamic row height measurement
          ref={node => rowVirtualizer.measureElement(node)} //measure dynamic row height
          key={row.id}
          className={"absolute grid w-full"}
          style={{
            transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
            gridTemplateColumns: columnTemplate,
          }}
      >{row.getVisibleCells().map((cell, index) => {
        return (
            <td
                key={cell.id}
                className={clsx( "px-3 whitespace-nowrap text-ellipsis overflow-hidden")}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
        )
      })}
      </tr>
  )
}