import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronRight, Database, Table as TableIcon, Loader2 } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
} from "@/components/ui/sidebar"

import { DBConnectionService } from "@main"
import type { TableInfo } from "@main"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionName, setConnectionName] = useState<string>("");

  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the active connection ID from localStorage
        const connectionId = localStorage.getItem('activeConnectionId');

        if (!connectionId) {
          setError("No active connection");
          setIsLoading(false);
          return;
        }

        // Get connection details to display the name
        const connections = await DBConnectionService.GetConnections();
        const activeConnection = connections.find(conn => conn.id === connectionId);
        if (activeConnection) {
          setConnectionName(activeConnection.name);
        }

        // Fetch tables for the active connection
        const tables = await DBConnectionService.GetDatabaseTables(connectionId);
        setTables(tables);
      } catch (error) {
        console.error("Error fetching tables:", error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTables();
  }, []);

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
              ) : error ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    Error: {error}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : tables.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    No tables found
                  </SidebarMenuButton>
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
                          {tables.map((table, index) => (
                            <SidebarMenuButton
                              key={index}
                              className="ml-6"
                              onClick={() => {
                                // Set up a query for this table when clicked
                                if (window.sqlEditor) {
                                  window.sqlEditor.setValue(`SELECT * FROM ${table.name} LIMIT 100;`);
                                }
                              }}
                            >
                              <TableIcon />
                              {table.name}
                            </SidebarMenuButton>
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
  )
}

