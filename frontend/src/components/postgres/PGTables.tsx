import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Table as TableIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { DBConnectionService } from "@/main";
import { type NodeProps } from "./PGTopItem";
import { PGColumns } from "./PGColumns";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { useTabActions } from "@/stores/tabs";

// parentId: `${database}::${schema}`
export function PGTables({ connectionId, parentId }: NodeProps) {
  const [db, schema] = (parentId || "::").split("::");
  const key = `${db}::${schema}`;
  const queryClient = useQueryClient();
  const { openTab } = useTabActions();

  const {
    data: tables = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["tables", connectionId, db, schema],
    queryFn: async () => {
      const esc = (s: string) => s.replace(/'/g, "''");
      const sql = `SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = '${esc(schema)}' ORDER BY table_name`;
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
      return (rows || []).map((r: string[]) => ({ name: String(r[0]) }));
    },
    enabled: !!connectionId && !!db && !!schema,
    staleTime: 30_000,
  });

  const [openedTable, setOpenedTable] = useState<Record<string, boolean>>({});
  const [openedColumns, setOpenedColumns] = useState<Record<string, boolean>>(
    {},
  );

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
        <SidebarMenuButton>Loading tables...</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (tables.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>No tables</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {tables.map((table, idx) => {
        const tableKey = `${key}.${table.name}`;
        return (
          <Collapsible
            key={tableKey}
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
            onOpenChange={(open) =>
              setOpenedTable((prev) => ({ ...prev, [tableKey]: open }))
            }
          >
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <ChevronRight className="transition-transform" />
                    <TableIcon />
                    {table.name}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Show data</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem
                      onClick={() => {
                        const quoteIdent = (s: string) =>
                          `"${s.replace(/"/g, '""')}"`;
                        const fqtn = `${quoteIdent(schema)}.${quoteIdent(table.name)}`;
                        const sql = `SELECT * FROM ${fqtn};`;

                        openTab<"editor">({
                          type: "editor",
                          editorValue: sql,
                        });
                      }}
                    >
                      Show all data
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        const quoteIdent = (s: string) =>
                          `"${s.replace(/"/g, '""')}"`;
                        const fqtn = `${quoteIdent(schema)}.${quoteIdent(table.name)}`;
                        const sql = `SELECT * FROM ${fqtn} LIMIT 1000;`;
                        openTab<"editor">({
                          type: "editor",
                          editorValue: sql,
                        });
                      }}
                    >
                      Show 1000 data
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: [
                        "columns",
                        connectionId,
                        db,
                        schema,
                        table.name,
                      ],
                    })
                  }
                >
                  Refresh
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <CollapsibleContent>
              <SidebarMenuSub>
                {openedTable[tableKey] ? (
                  <Collapsible
                    className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                    onOpenChange={(open) =>
                      setOpenedColumns((prev) => ({
                        ...prev,
                        [tableKey]: open,
                      }))
                    }
                  >
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <ChevronRight className="transition-transform" />
                            Columns
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() =>
                            queryClient.invalidateQueries({
                              queryKey: [
                                "columns",
                                connectionId,
                                db,
                                schema,
                                table.name,
                              ],
                            })
                          }
                        >
                          Refresh
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {openedColumns[tableKey] ? (
                          <PGColumns
                            connectionId={connectionId}
                            parentId={`${db}::${schema}::${table.name}`}
                          />
                        ) : null}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </>
  );
}
