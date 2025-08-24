import {Button} from '@/components/ui/button'
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
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
import PostgresLogo from '@/images/PostgresLogo.png'
import MySQLLogo from '@/images/MySQLLogo.png'

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
    const logoSrc = connection.type === 'postgres'
        ? PostgresLogo
        : MySQLLogo
    const logoAlt = connection.type === 'postgres' ? 'PostgreSQL logo' : 'MySQL logo'

    return (
        <Card>
            <div className={"flex"}>
                <div className={"flex-1 flex flex-col gap-4"}>
                    <CardHeader className="flex flex-row items-start gap-4">
                        <div className="grid gap-1">
                            <CardTitle>{connection.name}</CardTitle>
                            {/* Removed textual database type per requirements */}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Host:</span> {connection.host}</div>
                            <div><span className="font-medium">Port:</span> {connection.port}</div>
                            <div><span className="font-medium">Database:</span> {connection.database}</div>
                            <div><span className="font-medium">Username:</span> {connection.username}</div>
                        </div>
                    </CardContent>
                </div>
                <img src={logoSrc} alt={logoAlt} className="h-16 w-16  object-contain pe-6" />

            </div>

            <CardFooter className="flex gap-2">
                <Button onClick={() => onConnect(connection)} className="flex-1">
                    Connect
                </Button>
                <DeleteButton connection={connection} onConfirm={() => onDelete(connection)}/>
            </CardFooter>
        </Card>
    )
}
