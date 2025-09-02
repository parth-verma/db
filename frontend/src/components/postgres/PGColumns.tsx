import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { DBConnectionService } from "@main";
import { type NodeProps } from "./PGTopItem";
import { Key, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// parentId: `${database}::${schema}::${table}`
export function PGColumns({ connectionId, parentId }: NodeProps) {
  const [db, schema, table] = (parentId || "::::").split("::");
  const queryClient = useQueryClient();

  const {
    data: columns = [],
    isLoading,
    isError,
    error,
  } = useQuery<
    {
      name: string;
      dataType: string;
      isPrimary: boolean;
      isForeign: boolean;
      fkTarget?: string;
    }[]
  >({
    queryKey: ["columns", connectionId, db, schema, table],
    queryFn: async () => {
      const esc = (s: string) => s.replace(/'/g, "''");
      const sql = `
        SELECT
          c.column_name,
          c.data_type,
          CASE WHEN EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND kcu.table_schema = c.table_schema
              AND kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
          ) THEN 1 ELSE 0 END AS is_primary,
          CASE WHEN EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.table_schema = c.table_schema
              AND kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
          ) THEN 1 ELSE 0 END AS is_foreign,
          (
            SELECT ccu.table_schema
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.table_schema = c.table_schema
              AND kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
            LIMIT 1
          ) AS fk_schema,
          (
            SELECT ccu.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.table_schema = c.table_schema
              AND kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
            LIMIT 1
          ) AS fk_table
        FROM information_schema.columns c
        WHERE c.table_schema='${esc(schema)}' AND c.table_name='${esc(table)}'
        ORDER BY c.ordinal_position
      `;
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
      return (rows || []).map((r: string[]) => {
        const name = String(r[0]);
        const dataType = String(r[1] || "");
        const isPrimary =
          String(r[2]) === "1" ||
          String(r[2]).toLowerCase() === "t" ||
          String(r[2]).toLowerCase() === "true";
        const isForeign =
          String(r[3]) === "1" ||
          String(r[3]).toLowerCase() === "t" ||
          String(r[3]).toLowerCase() === "true";
        const fkSchema = String(r[4] || "");
        const fkTable = String(r[5] || "");
        const fkTarget =
          fkSchema && fkTable
            ? `${fkSchema}.${fkTable}`
            : fkTable || fkSchema || undefined;
        return { name, dataType, isPrimary, isForeign, fkTarget };
      });
    },
    enabled: !!connectionId && !!db && !!schema && !!table,
    staleTime: 30_000,
  });

  if (isError) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>
          Error: {error instanceof Error ? error.message : String(error)}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>Loading columns...</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (columns.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>No columns</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {columns.map((col, idx) => (
        <ContextMenu key={`${schema}.${table}.col.${idx}`}>
          <ContextMenuTrigger asChild>
            <SidebarMenuButton className={"gap-3"}>
              <span>{col.name}</span>
              {col.isPrimary && (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Key className={clsx("h-4 w-4 text-amber-500")} />
                  </TooltipTrigger>
                  <TooltipContent side="right">Primary key</TooltipContent>
                </Tooltip>
              )}
              {col.isForeign && (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <ExternalLink className={clsx("h-4 w-4 text-blue-500")} />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {col.fkTarget
                      ? `References ${col.fkTarget}`
                      : "Foreign key"}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuButton>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["columns", connectionId, db, schema, table],
                })
              }
            >
              Refresh
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </>
  );
}
