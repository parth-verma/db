import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'
import {clsx} from 'clsx'
import { useMediaQuery } from '@custom-react-hooks/use-media-query';
import {Button} from '@/components/ui/button'
import {Toaster} from "@/components/ui/sonner"
import {toast} from "sonner"
import {QueryClient, QueryClientProvider, useQuery, useQueryClient, useMutation} from '@tanstack/react-query'

import {DBConnectionService, type DBConnection} from '@main'
import {ConnectionCard} from '@/components/ConnectionCard'
import NewConnectionDialog from '@/components/NewConnectionDialog'

type DatabaseConnection = DBConnection;

const queryClient = new QueryClient()

function ConnectionsPage() {
    const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Load connections using React Query
    const {data: connections = [], isLoading, isError} = useQuery<DatabaseConnection[]>({
        queryKey: ['connections'],
        queryFn: () => DBConnectionService.GetConnections(),
        retry: false,
    })

    // Toast on load error
    useEffect(() => {
        if (isError) {
            toast.error("Error", {description: "Failed to load database connections"})
        }
    }, [isError])


    const connectMutation = useMutation({
        mutationFn: async (connection: DatabaseConnection) => {
            // Test the connection first
            await DBConnectionService.TestConnection(connection)
            return true
        },
        onSuccess: (_data, connection) => {
            // Store the active connection ID in localStorage
            localStorage.setItem('activeConnectionId', connection.id)
            // Redirect to the query page
            window.location.href = '/'
            toast.success("Connected", {description: "Connected to database"})
        },
        onError: (error) => {
            console.error('Failed to connect:', error)
            toast.error("Connection Failed", {
                description: "Failed to connect to database",
            })
        },
    })

    const deleteConnectionMutation = useMutation({
        mutationFn: async (connection: DatabaseConnection) => {
            await DBConnectionService.DeleteConnection(connection.id)
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ['connections']})
            toast.success("Success", {description: "Connection deleted successfully"})
        },
        onError: () => {
            toast.error("Error", {
                description: "Failed to delete database connection",
            })
        },
    })

    return (
        <div className={clsx("min-h-svh min-w-svw bg-background", isDarkMode && "dark")}>
            <Toaster/>
            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Database Connections</h1>
                    <Button onClick={() => setIsDialogOpen(true)}>New Connection</Button>
                    <NewConnectionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : connections.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 text-center">
                        <h2 className="text-xl font-semibold mb-2">No connections found</h2>
                        <p className="text-muted-foreground mb-4">Create a new database connection to get started</p>
                        <Button onClick={() => setIsDialogOpen(true)}>Create Connection</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-6">
                        {connections.map(connection => (
                            <ConnectionCard
                                key={connection.id}
                                connection={connection}
                                onConnect={(connection) => connectMutation.mutate(connection)}
                                onDelete={(connection) => deleteConnectionMutation.mutate(connection)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Wait for the DOM to be ready before rendering
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <ConnectionsPage/>
            </QueryClientProvider>
        </React.StrictMode>,
    )
}
