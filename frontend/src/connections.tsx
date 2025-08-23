import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {clsx} from 'clsx'
import {useMediaQuery} from 'use-custom-hooks'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import {Toaster} from "@/components/ui/sonner"
import {toast} from "sonner"
import {QueryClient, QueryClientProvider, useQuery, useQueryClient} from '@tanstack/react-query'

import type {DBConnection} from "@main";
// Import the database connection service
import {DBConnectionService} from '@main'
import {ConnectionCard} from '@/components/ConnectionCard'

type DatabaseConnection = DBConnection;

const queryClient = new QueryClient()

function ConnectionsPage() {
    const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newConnection, setNewConnection] = useState<Partial<DatabaseConnection>>({
        type: 'postgres',
        port: 5432
    })

    // Load connections using React Query
    const {data: connections = [], isLoading, isError} = useQuery<DatabaseConnection[]>({
        queryKey: ['connections'],
        queryFn: () => DBConnectionService.GetConnections(),
    })

    // Toast on load error
    useEffect(() => {
        if (isError) {
            toast.error("Error", {description: "Failed to load database connections"})
        }
    }, [isError])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setNewConnection(prev => ({
            ...prev,
            [name]: name === 'port' ? parseInt(value) || '' : value
        }))
    }

    const handleSelectChange = (value: string) => {
        setNewConnection(prev => ({
            ...prev,
            type: value as 'postgres' | 'mysql',
            port: value === 'postgres' ? 5432 : 3306
        }))
    }

    const handleCreateConnection = async () => {
        if (!newConnection.name || !newConnection.host || !newConnection.username || !newConnection.database) {
            toast.error("Validation Error", {
                description: "Please fill in all required fields",
            })
            return
        }

        try {
            const newConn: DatabaseConnection = {
                id: Date.now().toString(), // Backend will handle this if empty
                name: newConnection.name as string,
                type: newConnection.type as string,
                host: newConnection.host as string,
                port: newConnection.port as number,
                username: newConnection.username as string,
                password: newConnection.password as string,
                database: newConnection.database as string
            }

            // Test the connection first
            await DBConnectionService.TestConnection(newConn)

            // Save the connection
            await DBConnectionService.SaveConnection(newConn)

            // Refresh connections
            await queryClient.invalidateQueries({queryKey: ['connections']})

            // Close dialog and reset form
            setIsDialogOpen(false)
            setNewConnection({
                type: 'postgres',
                port: 5432
            })
            toast.success("Success", {description: "Connection created successfully"})

        } catch (error) {
            console.error('Failed to create connection:', error)
            toast.error("Error", {
                description: "Failed to create database connection",
            })
        }
    }

    const handleConnect = async (connection: DatabaseConnection) => {
        try {
            // Test the connection first
            await DBConnectionService.TestConnection(connection)

            // Store the active connection ID in localStorage
            localStorage.setItem('activeConnectionId', connection.id)

            // Redirect to the query page
            window.location.href = '/'
            toast.success("Connected", {description: "Connected to database"})
        } catch (error) {
            console.error('Failed to connect:', error)
            toast.error("Connection Failed", {
                description: "Failed to connect to database",
            })
        }
    }

    const handleDelete = async (connection: DatabaseConnection) => {
        try {
            await DBConnectionService.DeleteConnection(connection.id)
            await queryClient.invalidateQueries({queryKey: ['connections']})
            toast.success("Success", {description: "Connection deleted successfully"})
        } catch (error) {
            toast.error("Error", {
                description: "Failed to delete database connection",
            })
        }
    }

    return (
        <div className={clsx("min-h-svh min-w-svw bg-background", isDarkMode && "dark")}>
            <Toaster/>
            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Database Connections</h1>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>New Connection</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Connection</DialogTitle>
                                <DialogDescription>
                                    Enter the details for your database connection.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={newConnection.name || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        placeholder="My Database"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Type</Label>
                                    <Select
                                        value={newConnection.type}
                                        onValueChange={handleSelectChange}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select database type"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="postgres">PostgreSQL</SelectItem>
                                            <SelectItem value="mysql">MySQL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="host" className="text-right">Host</Label>
                                    <Input
                                        id="host"
                                        name="host"
                                        value={newConnection.host || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        placeholder="localhost"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="port" className="text-right">Port</Label>
                                    <Input
                                        id="port"
                                        name="port"
                                        type="number"
                                        value={newConnection.port || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        placeholder={newConnection.type === 'postgres' ? '5432' : '3306'}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="username" className="text-right">Username</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        value={newConnection.username || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={newConnection.password || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="database" className="text-right">Database</Label>
                                    <Input
                                        id="database"
                                        name="database"
                                        value={newConnection.database || ''}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleCreateConnection}>Create Connection</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {connections.map(connection => (
                            <ConnectionCard
                                key={connection.id}
                                connection={connection}
                                onConnect={handleConnect}
                                onDelete={handleDelete}
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
