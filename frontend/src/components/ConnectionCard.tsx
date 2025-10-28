import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PostgresLogo from "@/images/PostgresLogo.png";
import MySQLLogo from "@/images/MySQLLogo.png";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu.tsx";
import { useMediaQuery } from "@custom-react-hooks/use-media-query";
import { useState } from "react";
import { DBConnection } from "@/main/utils";

type Props = {
  connection: DBConnection;
  onConnect: (connection: DBConnection) => void | Promise<void>;
  onDelete: (connection: DBConnection) => void | Promise<void>;
  onEdit?: (connection: DBConnection) => void | Promise<void>;
};

function DeleteButton({
  connection,
  onConfirm,
  open,
  onOpenChange,
}: {
  connection: DBConnection;
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Connection</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {connection.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant={"destructive"} onClick={onConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ConnectionCard({
  connection,
  onConnect,
  onDelete,
  onEdit,
}: Props) {
  const logoSrc = connection.type === "postgres" ? PostgresLogo : MySQLLogo;
  const logoAlt =
    connection.type === "postgres" ? "PostgreSQL logo" : "MySQL logo";
  const isDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [open, setOpen] = useState(false);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          onClick={() => onConnect(connection)}
          className={
            "cursor-pointer hover:bg-sidebar-accent hover:border-accent"
          }
        >
          <div className={"flex max-w-full overflow-hidden"}>
            <div className={"flex-1 max-w-full overflow-hidden"}>
              <CardHeader className="flex flex-row gap-4 flex-1 items-center max-w-full overflow-hidden">
                <CardTitle className={"text-xl"}>{connection.name}</CardTitle>
              </CardHeader>
              <CardContent className={"max-w-full overflow-hidden"}>
                <span
                  className="text-sm text-muted-foreground text-ellipsis block overflow-hidden max-w-full whitespace-nowrap"
                  title={`${connection.host}:${connection.port}`}
                >
                  {connection.host}:{connection.port}
                </span>
              </CardContent>
            </div>
            <img
              src={logoSrc}
              alt={logoAlt}
              className="h-12 w-12  object-contain pe-6"
            />
          </div>
          <DeleteButton
            connection={connection}
            onConfirm={() => onDelete(connection)}
            open={open}
            onOpenChange={setOpen}
          />
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className={isDarkMode ? "dark" : ""}>
        <ContextMenuItem onClick={() => onConnect(connection)}>
          Connect
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onEdit?.(connection)}>
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setOpen(true)} variant={"destructive"}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
