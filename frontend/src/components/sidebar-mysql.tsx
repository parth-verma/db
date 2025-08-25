import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Database,
  Table as TableIcon,
  Loader2,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarRail,
} from "@/components/ui/sidebar";

import { DBConnectionService } from "@main";

interface MySQLSidebarProps extends React.ComponentProps<typeof Sidebar> {
  connectionId: string;
  connectionName: string;
}

function MySQLTables({
  connectionId,
  dbName,
}: {
  connectionId: string;
  dbName: string;
}) {
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
      return (rows || []).map((r: string[]) => ({ name: String(r[0]) }));
    },
    enabled: !!connectionId && !!dbName,
    staleTime: 30_000,
  });

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
      {tables.map((table, idx) => (
        <SidebarMenuButton
          key={`${dbName}.${idx}`}
          className="ml-8"
          onClick={() => {
            if (window.sqlEditor) {
              window.sqlEditor.setValue(
                `SELECT * FROM \`${dbName}\`.\`${table.name}\` LIMIT 100;`,
              );
            }
          }}
        >
          <TableIcon />
          {table.name}
        </SidebarMenuButton>
      ))}
    </>
  );
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
      const sql = `SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`;
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
                                <SidebarMenuButton className="ml-4">
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
      <SidebarRail />
    </Sidebar>
  );
}
