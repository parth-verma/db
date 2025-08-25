import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { PGTopItem } from "./postgres/PGTopItem";

interface PostgresSidebarProps extends React.ComponentProps<typeof Sidebar> {
  connectionId: string;
}

export function PostgresSidebar({
  connectionId,
  ...props
}: PostgresSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Database Tables</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <PGTopItem connectionId={connectionId} parentId={connectionId} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
