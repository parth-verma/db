import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, {MouseEvent, useRef} from "react";
import { columns } from "../../bindings/changeme/internal";
import {clsx} from "clsx";

// Define a type for our dynamic row data
type DynamicRow = Record<string, string>;

// Default empty data
const defaultData: DynamicRow[] = [];

export function Table({
  columnInfo = [] as columns[],
  rowData = [] as string[][],
}) {
  // Convert the 2D array of strings to an array of objects
  // where each object represents a row with column names as keys
  const tableRef = useRef<HTMLTableElement>(null)
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
      header: col.Name,
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
      meta: {
        type: col.Type,
      },
    }));
  }, [columnInfo]);

  // Use the processed data

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  const onMouseDown = (handler: React.EventHandler<MouseEvent>) => {
    return (e: MouseEvent<HTMLSpanElement>) => {
      handler(e);
      if (!tableRef.current) return;
      tableRef.current.style.setProperty('cursor', 'col-resize');
      tableRef.current.style.setProperty('user-select', 'none');
      tableRef.current.style.setProperty('-webkit-user-select', 'none');

      window.addEventListener('mouseup', () => {
        if (!tableRef.current) return;
        tableRef.current.style.removeProperty('user-select');
        tableRef.current.style.removeProperty('-webkit-user-select');
        tableRef.current.style.removeProperty('cursor');
      }, {once: true})

    }
  }

  return (
    <div className="w-full overflow-auto max-h-full">
      <table className={"min-w-full"} ref={tableRef}>
        <thead className="bg-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={clsx("bg-secondary px-3 py-2 text-left text-sm font-medium text-secondary-foreground border-b border-border relative")}
                  style={{width: header.getSize()}}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {header.column.getCanResize() && (
                      <span
                          onMouseDown={onMouseDown(header.getResizeHandler())}
                          onTouchStart={header.getResizeHandler()}
                          className={'cursor-col-resize h-5 px-2 touch-none select-none absolute top-2/4 right-0 transform -translate-y-1/2'}
                      >
                        <div className={'w-0.5 h-full bg-border'}></div>
                      </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={"hover:bg-muted"}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={"px-3 py-2 text-sm"} style={{
                  width: cell.column.getSize()
                }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
