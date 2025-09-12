import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row as DRow,
  RowData,
  type Table as DTable,
  useReactTable,
} from "@tanstack/react-table";
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from "@tanstack/react-virtual";
import React, {forwardRef, MouseEvent, useImperativeHandle, useLayoutEffect, useRef} from "react";
import type {IQueryResult, IRow} from "@/lib/query-result";
import { clsx } from "clsx";

// Define a type for our dynamic row data

export interface TableRef {
  scrollToTop: () => void;
}

export const Table = forwardRef<TableRef, {
  queryResult?: IQueryResult | null,
}>(({ queryResult = null }, ref) => {
  const processedData = React.useMemo(() => {
    return queryResult?.getRows() ?? [];
  }, [queryResult]);

  // Dynamically create columns based on the queryResult
  const columns = React.useMemo(() => {
    if (!queryResult || queryResult.colCount() === 0) return [];
    const cols = queryResult.columns;

    return cols.map(
      (col, idx): ColumnDef<IRow> => ({
        id: idx.toString(),
        header: () => (
          <div className="flex flex-col">
            <span>{col.name}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {col.type}
            </span>
          </div>
        ),
        minSize: Math.max(col.name.length, col.type.length) * 7 + 24,
        cell: ({row, column}) => row.original.get(parseInt(column.id)),
      }),
    );
  }, [queryResult?.columns]);

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  return <TableCore table={table} ref={ref} />;
});

Table.displayName = "Table";

const TableCore = forwardRef<TableRef, { table: DTable<IRow> }>(({ table }, ref) => {
  // Convert the 2D array of strings to an array of objects
  // where each object represents a row with column names as keys
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  const onMouseDown = (handler: React.EventHandler<MouseEvent>) => {
    return (e: MouseEvent<HTMLSpanElement>) => {
      handler(e);
      if (!tableContainerRef.current) return;
      tableContainerRef.current.classList.add(
        "cursor-col-resize",
        "select-none",
      );

      window.addEventListener(
        "mouseup",
        () => {
          if (!tableContainerRef.current) return;
          tableContainerRef.current.classList.remove(
            "cursor-col-resize",
            "select-none",
          );
        },
        { once: true },
      );
    };
  };

  useImperativeHandle(ref, () => {
    return {
      scrollToTop: () => {
        tableContainerRef?.current?.scrollTo({
          top: 0,
          behavior: "instant"
        })
      }
    }
  }, [])

  const columnTemplate =
    table
      .getAllColumns()
      .slice(0, -1)
      .map((col) => col.getSize() + "px")
      .join(" ") + " 1fr";
  return (
    <div
      className="min-w-full overflow-auto max-h-full relative h-full"
      ref={tableContainerRef}
    >
      <table className={"min-w-full grid relative"}>
        <thead className="bg-secondary top-0 z-10 sticky ">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className={"grid w-full"}
              style={{ gridTemplateColumns: columnTemplate }}
            >
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={clsx(
                    "bg-secondary px-3 py-2 text-left text-sm font-medium text-secondary-foreground border-b border-border relative",
                  )}
                  style={{
                    width:
                      index === headerGroup.headers.length - 1
                        ? ""
                        : header.getSize(),
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {index !== headerGroup.headers.length - 1 &&
                    header.column.getCanResize() && (
                      <span
                        onMouseDown={onMouseDown(header.getResizeHandler())}
                        onTouchStart={header.getResizeHandler()}
                        className={
                          "cursor-col-resize h-5 px-2 touch-none select-none absolute top-2/4 -right-2.5 transform -translate-y-1/2 z-10"
                        }
                      >
                        <div className={"w-0.5 h-full bg-border"}></div>
                      </span>
                    )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        {isMounted && (
          <TableBody table={table} tableContainerRef={tableContainerRef} />
        )}
      </table>
    </div>
  );
});

TableCore.displayName = "TableCore";

interface TableBodyProps {
  table: DTable<IRow>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
}

function TableBody({ table, tableContainerRef }: TableBodyProps) {
  const { rows } = table.getRowModel();

  // Important: Keep the row virtualizer in the lowest component possible to avoid unnecessary re-renders.
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 24, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  return (
    <tbody
      className="divide-y divide-border relative min-w-full"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index] as DRow<RowData>;
        return (
          <TableBodyRow
            key={row.id}
            row={row}
            virtualRow={virtualRow}
            rowVirtualizer={rowVirtualizer}
          />
        );
      })}
    </tbody>
  );
}

interface TableBodyRowProps {
  row: DRow<RowData>;
  virtualRow: VirtualItem;
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
}

function TableBodyRow({ row, virtualRow, rowVirtualizer }: TableBodyRowProps) {
  const columnTemplate =
    row
      .getVisibleCells()
      .slice(0, -1)
      .map((cell) => cell.column.getSize() + "px")
      .join(" ") + " 1fr";

  return (
    <tr
      data-index={virtualRow.index} //needed for dynamic row height measurement
      ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
      key={row.id}
      className={"absolute grid w-full"}
      style={{
        transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
        gridTemplateColumns: columnTemplate,
      }}
    >
      {row.getVisibleCells().map((cell, index) => {
        return (
          <td
            key={cell.id}
            className={clsx(
              "px-3 whitespace-nowrap text-ellipsis overflow-hidden",
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}
