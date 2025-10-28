import {useTabActions} from "@/stores/tabs";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {DBConnectionService} from "@/main";
import {useState} from "react";
import {SidebarMenuButton, SidebarMenuItem, SidebarMenuSub} from "@/components/ui/sidebar.tsx";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible.tsx";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger
} from "@/components/ui/context-menu.tsx";
import {ChevronRight, Table as TableIcon} from "lucide-react";
import {MySQLColumns} from "@/components/mysql/MySQLColumns.tsx";

export function MySQLTables({
                                connectionId,
                                dbName,
                            }: {
    connectionId: string;
    dbName: string;
}) {
    const {openTab} = useTabActions();

    const {
        data: tables = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["tables", connectionId, dbName],
        queryFn: async () => {
            const esc = (s: string) => s.replace(/`/g, "``").replace(/'/g, "''");
            const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${esc(dbName)}' ORDER BY table_name`;
            const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
            return (rows || []).map((r: string[]) => ({name: String(r[0])}));
        },
        enabled: !!connectionId && !!dbName,
        staleTime: 30_000,
    });
    const [openedTable, setOpenedTable] = useState<Record<string, boolean>>({});
    const [openedColumns, setOpenedColumns] = useState<Record<string, boolean>>({});
    const queryClient = useQueryClient();

    if (isLoading) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton className="ml-8">
                    Loading tables...
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    if (isError) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton className="ml-8">
                    Error: {error instanceof Error ? error.message : String(error)}
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    if (tables.length === 0) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton className="ml-8">No tables</SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    return (
        <>
            {tables.map((table) => {
                const tableKey = `${dbName}.${table.name}`;
                return (
                    <Collapsible
                        key={tableKey}
                        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                        onOpenChange={(open) =>
                            setOpenedTable((prev) => ({...prev, [tableKey]: open}))
                        }
                    >
                        <ContextMenu>
                            <ContextMenuTrigger asChild>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton>
                                        <ChevronRight className="transition-transform"/>
                                        <TableIcon/>
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
                                                const sql = `SELECT * FROM \`${dbName}\`.\`${table.name}\`;`;
                                                openTab<'editor'>({
                                                    type: 'editor',
                                                    editorValue: sql,
                                                });
                                            }}
                                        >
                                            Show all data
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            onClick={() => {
                                                const sql = `SELECT * FROM \`${dbName}\`.\`${table.name}\` LIMIT 1000;`;
                                                openTab<'editor'>({
                                                    type: 'editor',
                                                    editorValue: sql,
                                                });
                                            }}
                                        >
                                            Show 1000 data
                                        </ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                            </ContextMenuContent>
                        </ContextMenu>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {openedTable[tableKey] ? (
                                    <Collapsible
                                        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                                        onOpenChange={(open) =>
                                            setOpenedColumns((prev) => ({...prev, [tableKey]: open}))
                                        }
                                    >
                                        <ContextMenu>
                                            <ContextMenuTrigger asChild>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton>
                                                        <ChevronRight className="transition-transform"/>
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
                                                                dbName,
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
                                                    <MySQLColumns
                                                        connectionId={connectionId}
                                                        dbName={dbName}
                                                        tableName={table.name}
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