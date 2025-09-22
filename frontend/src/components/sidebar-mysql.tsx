import * as React from "react";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ChevronRight, Database, Loader2,} from "lucide-react";

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";

import {DBConnectionService} from "@/main";
import {MySQLTables} from "@/components/mysql/MySQLTables.tsx";

interface MySQLSidebarProps extends React.ComponentProps<typeof Sidebar> {
  connectionId: string;
  connectionName: string;
}

export function MySQLSidebar({
  connectionId,
  connectionName,
  ...props
}: MySQLSidebarProps) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  const {
    data: databases = [],
    isLoading,
    isError,
    error,
  } = useQuery<string[]>({
    queryKey: ["databases", connectionId],
    queryFn: async () => {
      const sql = `SELECT schema_name FROM information_schema.schemata where schema_name != 'mysql' ORDER BY schema_name`;
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql);
      return (rows || []).map((r: string[]) => String(r[0]));
    },
    enabled: !!connectionId,
    staleTime: 30_000,
  });

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Database Tables</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Loader2 className="animate-spin" />
                    Loading tables...
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : isError ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    Error:{" "}
                    {error instanceof Error ? error.message : String(error)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : databases.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>No databases found</SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <>
                  <SidebarMenuItem>
                    <Collapsible
                      className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                      defaultOpen={true}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <ChevronRight className="transition-transform" />
                          <Database />
                          {connectionName || "Database"}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {databases.map((dbName) => (
                            <Collapsible
                              key={dbName}
                              className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                              onOpenChange={(open) => {
                                setOpened((prev) => ({
                                  ...prev,
                                  [dbName]: open,
                                }));
                              }}
                            >
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton>
                                  <ChevronRight className="transition-transform" />
                                  {dbName}
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {opened[dbName] ? (
                                    <MySQLTables
                                      connectionId={connectionId}
                                      dbName={dbName}
                                    />
                                  ) : null}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

