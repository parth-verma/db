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
import { PGTables } from "./PGTables";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// parentId: database name
export function PGSchemas({ connectionId, parentId }: NodeProps) {
  const database = parentId || "";
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const {
    data: schemas = [],
    isLoading,
    isError,
    error,
  } = useQuery<string[]>({
    queryKey: ["schemas", connectionId, database],
    queryFn: async () => {
      const sql = `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY schema_name`;
      // We must connect to the selected database for Postgres; use RunQueryIn
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
      return (rows || []).map((r: string[]) => String(r));
    },
    enabled: !!connectionId && !!database,
    staleTime: 30_000,
  });

  return (
    <>
      {isLoading && !isError ? (
        <SidebarMenuItem>
          <SidebarMenuButton>
            Loading schemas...
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : isError ? (
        <SidebarMenuItem>
          <SidebarMenuButton>
            Error: {error instanceof Error ? error.message : String(error)}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : schemas.length === 0 ? (
        <SidebarMenuItem>
          <SidebarMenuButton>No schemas</SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        schemas.map((schema) => (
          <Collapsible
            key={schema}
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
            onOpenChange={(open) =>
              setOpened((prev) => ({ ...prev, [schema]: open }))
            }
          >
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <ChevronRight className="transition-transform" />
                    {schema}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["tables", connectionId, database, schema],
                    })
                  }
                >
                  Refresh
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <CollapsibleContent>
              <SidebarMenuSub>
                {opened[schema] ? (
                  <PGTables
                    connectionId={connectionId}
                    parentId={`${database}::${schema}`}
                  />
                ) : null}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))
      )}
    </>
  );
}
