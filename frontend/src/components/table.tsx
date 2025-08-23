import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import React from "react";
import { columns } from "../../bindings/changeme/internal";

// Define a type for our dynamic row data
type DynamicRow = Record<string, string>;

// Default empty data
const defaultData: DynamicRow[] = [];

export function Table({ 
    columnInfo = [] as columns[], 
    rowData = [] as string[][] 
}) {
    // Convert the 2D array of strings to an array of objects
    // where each object represents a row with column names as keys
    const processedData = React.useMemo(() => {
        if (!columnInfo.length || !rowData.length) return defaultData;

        return rowData.map(row => {
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

        return columnInfo.map(col => ({
            accessorKey: col.Name,
            header: col.Name,
            cell: (info: any) => info.getValue(),
            footer: (info: any) => info.column.id,
            meta: {
                type: col.Type
            }
        }));
    }, [columnInfo]);

    // Use the processed data
    const [data, _setData] = React.useState(() => processedData)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="w-full">
            <table className={"min-w-full"}>
                <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
                </thead>
                <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
