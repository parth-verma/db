import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import type {DBConnection} from '@main'

type Props = {
    connection: DBConnection
    onConnect: (connection: DBConnection) => void | Promise<void>
    onDelete: (connection: DBConnection) => void | Promise<void>
}

function DeleteButton({connection, onConfirm}: { connection: DBConnection, onConfirm: () => void }) {

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="flex-1" variant="outline">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete {connection.name}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant={'destructive'} onClick={onConfirm}>
                        Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function ConnectionCard({connection, onConnect, onDelete}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{connection.name}</CardTitle>
                <CardDescription>
                    {connection.type === 'postgres' ? 'PostgreSQL' : 'MySQL'} Database
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Host:</span> {connection.host}</div>
                    <div><span className="font-medium">Port:</span> {connection.port}</div>
                    <div><span className="font-medium">Database:</span> {connection.database}</div>
                    <div><span className="font-medium">Username:</span> {connection.username}</div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button onClick={() => onConnect(connection)} className="flex-1">
                    Connect
                </Button>
                <DeleteButton connection={connection} onConfirm={() => onDelete(connection)}/>
            </CardFooter>
        </Card>
    )
}
