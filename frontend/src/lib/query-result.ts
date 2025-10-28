/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Columns as ColDef } from "@/main/utils";

export interface IColumn {
  readonly name: string;
  readonly type: string;
}

export interface IRow {
  get(col: number | string): any;
}

export interface IQueryResult {
  readonly columns: IColumn[];
  getRow(row: number): IRow;
  rowCount(): number;
  colCount(): number;
  getRows(): IRow[];
  // Optional: column type accessor if available
}

/**
 * QueryResult is a small helper to access DB query results.
 * It normalizes column definitions coming from the backend bindings
 * and provides convenient accessors by row/column index or column name.
 */
export class QueryResult implements IQueryResult {
  private readonly _cols: IColumn[];
  private readonly _rows: any[][];
  private readonly _nameToIndex: Map<string, number>;

  constructor(cols: Array<ColDef | string>, rows: any[][]) {
    this._cols = cols.map((c) => {
      if (typeof c === "string") {
        throw new Error("Invalid column definition: " + c);
      } else {
        return { name: c.Name, type: c.Type };
      }
    });
    this._rows = Array.isArray(rows) ? rows : [];
    this._nameToIndex = new Map(
      cols.map((name, idx) => [
        typeof name === "string" ? name : name?.Name,
        idx,
      ]),
    );
  }

  // Return names of columns
  get columns() {
    return this._cols;
  }

  getRows(): IRow[] {
    return this._rows.map((row) => {
      return {
        get: (col: number | string) => {
          const idx =
            typeof col === "number" ? col : this._nameToIndex.get(col);
          if (idx === undefined) {
            throw new Error(`Column ${col} not found`);
          }
          return row[idx];
        },
      };
    });
  }

  getRow(row: number): IRow {
    return {
      get: (col: number | string) => {
        const idx = typeof col === "number" ? col : this._nameToIndex.get(col);
        if (idx === undefined) {
          throw new Error(`Column ${col} not found`);
        }
        return this._rows[row][idx];
      },
    };
  }

  rowCount(): number {
    return this._rows.length;
  }

  colCount(): number {
    return this._cols.length;
  }
}

export default QueryResult;
