import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
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
import { DBConnectionService } from "@main";
import { type NodeProps } from "./PGTopItem";
import { PGSchemas } from "./PGSchemas";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function PGDatabases({ connectionId }: NodeProps) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const {
    data: databases = [],
    isLoading,
    isError,
    error,
  } = useQuery<string[]>({
    queryKey: ["databases", connectionId],
    queryFn: async () => {
      // Postgres: cluster-level list via pg_database; MySQL: schemata
      const sql = `SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true ORDER BY datname`;
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
      return (rows || []).map((r: string[]) => String(r[0]));
    },
    enabled: !!connectionId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>Loading databases...</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (isError) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>
          Error: {error instanceof Error ? error.message : String(error)}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (databases.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>No databases found</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {databases.map((db) => (
        <Collapsible
          key={db}
          className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
          onOpenChange={(open) => {
            setOpened((prev) => ({ ...prev, [db]: open }));
          }}
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <ChevronRight className="transition-transform" />
                  {db}
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["schemas", connectionId, db],
                  })
                }
              >
                Refresh
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <CollapsibleContent>
            <SidebarMenuSub>
              {opened[db] ? (
                <PGSchemas connectionId={connectionId} parentId={db} />
              ) : null}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </>
  );
}
