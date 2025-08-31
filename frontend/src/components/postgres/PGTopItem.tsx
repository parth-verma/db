import { ChevronRight, Database } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DBConnectionService, type DBConnection } from "@main";
import { PGDatabases } from "./PGDatabases";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface NodeProps {
  connectionId: string;
  parentId?: string | null;
}

export function PGTopItem({ connectionId }: NodeProps) {
  const queryClient = useQueryClient();
  // Reuse connections query to derive the display name
  const { data: conns = [] } = useQuery<DBConnection[]>({
    queryKey: ["connections"],
    queryFn: () => DBConnectionService.GetConnections(),
    staleTime: 30_000,
  });
  const active = conns?.find((c) => c.id === connectionId);
  const connectionName = active?.name || "Database";

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={true}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton>
                <ChevronRight className="transition-transform" />
                <Database />
                {connectionName}
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["databases", connectionId],
                })
              }
            >
              Refresh
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <CollapsibleContent>
          <SidebarMenuSub>
            <PGDatabases connectionId={connectionId} parentId={connectionId} />
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
