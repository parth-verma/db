import * as React from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { DBConnectionService } from "@/main";
import type {DBConnection} from "@/main/utils";
import { PostgresSidebar } from "./sidebar-postgres";
import { MySQLSidebar } from "./sidebar-mysql";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Read current active connection id from localStorage
  const connectionId = useMemo(() => {
    try {
      return localStorage.getItem("activeConnectionId");
    } catch {
      return null;
    }
  }, []);

  // Use React Query to load all connections (source of truth)
  const {
    data: connections = [],
    isLoading,
    isError,
    error,
  } = useQuery<DBConnection[]>({
    queryKey: ["connections"],
    queryFn: () => DBConnectionService.GetConnections(),
    retry: false,
  });

  const { connectionName, connectionType } = useMemo(() => {
    const active = connections.find((c) => c.id === connectionId);
    return {
      connectionName: active?.name ?? "",
      connectionType: active?.type ?? "",
    };
  }, [connections, connectionId]);

  if (isLoading) {
    return (
      <Sidebar {...props}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Database Tables</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Loading...</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  const errMsg = isError
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;
  if (errMsg || !connectionId || !connectionType) {
    return (
      <Sidebar {...props}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Database Tables</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    {errMsg ||
                      (!connectionId
                        ? "No active connection"
                        : "Active connection not found")}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  if (connectionType === "postgres") {
    return <PostgresSidebar connectionId={connectionId} {...props} />;
  }
  return (
    <MySQLSidebar
      connectionId={connectionId}
      connectionName={connectionName}
      {...props}
    />
  );
}
