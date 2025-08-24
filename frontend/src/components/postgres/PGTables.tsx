import { useQuery } from "@tanstack/react-query"
import { Table as TableIcon } from "lucide-react"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { DBConnectionService } from "@main"
import { type NodeProps } from "./PGTopItem"

// parentId: `${database}::${schema}`
export function PGTables({ connectionId, parentId }: NodeProps) {
  const [db, schema] = (parentId || "::").split("::")
  const key = `${db}::${schema}`

  const { data: tables = [], isLoading, isError, error } = useQuery({
    queryKey: ["tables", connectionId, db, schema],
    queryFn: async () => {
      const esc = (s: string) => s.replace(/'/g, "''")
      const sql = `SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = '${esc(schema)}' ORDER BY table_name`
      const [_, rows] = await DBConnectionService.RunQuery(connectionId, sql)
      return (rows || []).map((r: any[]) => ({ name: String(r[0]) }))
    },
    enabled: !!connectionId && !!db && !!schema,
    staleTime: 30_000,
  })

  if (isError) {
    const err = error as any
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="ml-12">Error: {err instanceof Error ? err.message : String(err)}</SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="ml-12">Loading tables...</SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (tables.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="ml-12">No tables</SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      {tables.map((table, idx) => (
        <SidebarMenuButton
          key={`${key}.${idx}`}
          className="ml-12"
          onClick={() => {
            if ((window as any).sqlEditor) {
              ;(window as any).sqlEditor.setValue(`SELECT * FROM ${schema}.${table.name} LIMIT 100;`)
            }
          }}
        >
          <TableIcon />
          {table.name}
        </SidebarMenuButton>
      ))}
    </>
  )
}
