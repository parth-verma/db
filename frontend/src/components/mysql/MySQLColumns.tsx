import {useQuery, useQueryClient} from "@tanstack/react-query";
import {DBConnectionService} from "@main";
import {SidebarMenuButton, SidebarMenuItem} from "@/components/ui/sidebar.tsx";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Key, Link} from "lucide-react";
import {clsx} from "clsx";

export function MySQLColumns({
                                connectionId,
                                dbName,
                                tableName,
                            }: {
    connectionId: string;
    dbName: string;
    tableName: string;
}) {
    const {data = [], isLoading, isError, error} = useQuery({
        queryKey: ["columns", connectionId, dbName, tableName],
        queryFn: async () => {
            const esc = (s: string) => s.replace(/`/g, "``").replace(/'/g, "''");
            const sql = `SELECT c.column_name,
                                c.data_type,
                                c.column_key,
                                CASE WHEN kcu.referenced_table_name IS NOT NULL THEN 1 ELSE 0 END AS is_fk
                         FROM information_schema.columns c
                         LEFT JOIN information_schema.key_column_usage kcu
                           ON kcu.table_schema = c.table_schema
                          AND kcu.table_name = c.table_name
                          AND kcu.column_name = c.column_name
                         WHERE c.table_schema = '${esc(dbName)}'
                           AND c.table_name = '${esc(tableName)}'
                         ORDER BY c.ordinal_position`;
            const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
            return (rows || []).map((r: string[]) => ({
                name: String(r[0]),
                type: String(r[1] || ""),
                pk: String(r[2] || "") === "PRI",
                fk: String(r[3] || "") === "1",
            }));
        },
        enabled: !!connectionId && !!dbName && !!tableName,
        staleTime: 30_000,
    });

    const queryClient = useQueryClient();

    if (isLoading) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton>Loading columns...</SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    if (isError) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton>Error: {error instanceof Error ? error.message : String(error)}</SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    if (data.length === 0) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton>No columns</SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return (
        <>
            {data.map((col, i) => (
                <ContextMenu key={`${tableName}.col.${i}`}>
                    <ContextMenuTrigger asChild>
                        <SidebarMenuButton className={"gap-3"}>
                            <span>{col.name}</span>
                            {col.pk && (
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <Key className={clsx("h-4 w-4 text-amber-500")} />
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Primary key</TooltipContent>
                                </Tooltip>
                            )}
                            {col.fk && (
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <Link className={clsx("h-4 w-4 text-sky-500")} />
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Foreign key</TooltipContent>
                                </Tooltip>
                            )}
                        </SidebarMenuButton>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem
                            onClick={() =>
                                queryClient.invalidateQueries({
                                    queryKey: ["columns", connectionId, dbName, tableName],
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