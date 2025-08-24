import React from 'react'
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
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {useQueryClient, useMutation} from '@tanstack/react-query'
import {type DBConnection as DatabaseConnection, DBConnectionService} from '@main'
import {createFormHook, createFormHookContexts} from "@tanstack/react-form";
import {z} from 'zod'
import {PasswordInput} from "@/components/ui/password-input.tsx";

export type NewConnectionDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated?: (conn: DatabaseConnection) => void
}

const {fieldContext, formContext} = createFormHookContexts()
const {useAppForm} = createFormHook({
    fieldComponents: {
        TextField: Input,
        PasswordField: PasswordInput,
    },
    formComponents: {
        Button,
    },
    fieldContext,
    formContext,
})

const mysqlSchema = z.object({
    name: z.string(),
    type: z.literal('mysql'),
    host: z.string(),
    port: z.number().optional().default(3306),
    username: z.string(),
    password: z.string().optional(),
    database: z.string(),
})

const postgresSchema = z.object({
    name: z.string(),
    type: z.literal('postgres'),
    host: z.string(),
    port: z.number().optional().default(5432),
    username: z.string(),
    password: z.string().optional(),
    database: z.string(),
})

const schema = z.discriminatedUnion("type", [
    mysqlSchema,
    postgresSchema,
])

const defaultValues: z.input<typeof schema> = {
    name: '',
    type: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    database: '',
}

export function NewConnectionDialog({open, onOpenChange, onCreated}: NewConnectionDialogProps) {
    const queryClient = useQueryClient()
    const createConnectionMutation = useMutation({
        mutationKey: ['create-connection'],
        mutationFn: async (value: DatabaseConnection) => {
            await DBConnectionService.TestConnection(value)
            await DBConnectionService.SaveConnection(value)
            return value
        },
        onSuccess: async (newConn) => {
            await queryClient.invalidateQueries({ queryKey: ['connections'] })
            onOpenChange(false)
            toast.success('Success', { description: 'Connection created successfully' })
            onCreated?.(newConn)
        }
    })
    const form = useAppForm({
        defaultValues,
        validators: {
            // Pass a schema or function to validate
            onSubmit: schema,
        },
        onSubmitInvalid: (errors) => {
          console.log('errors', errors)
        },
        onSubmit: async ({value}) => {
            const port = value.port ?? (value.type === 'postgres' ? 5432 : 3306)
            const newConn: DatabaseConnection = {
                id: crypto.randomUUID(),
                name: value.name,
                type: value.type as string,
                host: value.host as string,
                port,
                username: value.username as string,
                password: value.password ?? '',
                database: value.database as string,
            }
            await createConnectionMutation.mutateAsync(newConn)
        },
    })

    //
    //
    // const handleCreateConnection = async () => {
    //   if (!newConnection.name || !newConnection.host || !newConnection.username || !newConnection.database) {
    //     toast.error('Validation Error', {
    //       description: 'Please fill in all required fields',
    //     })
    //     return
    //   }
    //
    //   try {
    //     const newConn: DatabaseConnection = {
    //       id: Date.now().toString(),
    //       name: newConnection.name as string,
    //       type: newConnection.type as string,
    //       host: newConnection.host as string,
    //       port: newConnection.port as number,
    //       username: newConnection.username as string,
    //       password: (newConnection.password as string) || '',
    //       database: newConnection.database as string,
    //     }
    //
    //     await DBConnectionService.TestConnection(newConn)
    //     await DBConnectionService.SaveConnection(newConn)
    //     await queryClient.invalidateQueries({ queryKey: ['connections'] })
    //
    //     onOpenChange(false)
    //     toast.success('Success', { description: 'Connection created successfully' })
    //     onCreated?.(newConn)
    //   } catch (error) {
    //     console.error('Failed to create connection:', error)
    //     toast.error('Error', {
    //       description: 'Failed to create database connection',
    //     })
    //   }
    // }

    return (
        <Dialog open={open} onOpenChange={(open)=> {
            if (!open) {
                form.reset();
            }
            onOpenChange(open)
        }}>
            <DialogContent>
                <form autoComplete="off" className="grid gap-4 py-4" onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    form.handleSubmit()

                }}>
                    <DialogHeader>
                        <DialogTitle>Create New Connection</DialogTitle>
                        <DialogDescription>Enter the details for your database connection.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <form.AppField name={"name"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <field.TextField
                                                   id={field.name}
                                                   name={field.name}
                                                   className="w-full"
                                                   placeholder={'My Database'}
                                                   value={(field.state.value as string) ?? ''}
                                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                                   onBlur={field.handleBlur}
                                               />
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <form.AppField name={"type"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <Select name={field.name} value={field.state.value as string}
                                                       // @ts-expect-error - on value change is not typed based on select items
                                                       onValueChange={field.handleChange}>
                                                   <SelectTrigger id={field.name} onBlur={field.handleBlur}>
                                                       <SelectValue placeholder="Select database type"/>
                                                   </SelectTrigger>
                                                   <SelectContent>
                                                       <SelectItem value="postgres">PostgreSQL</SelectItem>
                                                       <SelectItem value="mysql">MySQL</SelectItem>
                                                   </SelectContent>
                                               </Select>
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="host" className="text-right">
                            Host
                        </Label>
                        <form.AppField name={"host"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <field.TextField
                                                   id={field.name}
                                                   name={field.name}
                                                   className="w-full"
                                                   value={(field.state.value as string) ?? ''}
                                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                                   onBlur={field.handleBlur}
                                               />
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />

                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="port" className="text-right">
                            Port
                        </Label>
                        <form.AppField name={"port"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <field.TextField
                                                   id={field.name}
                                                   name={field.name}
                                                   type="number"
                                                   className="w-full"
                                                   value={field.state.value ?? ''}
                                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                       const v = e.target.value
                                                       field.handleChange(v === '' ? undefined : Number(v))
                                                   }}
                                                   onBlur={field.handleBlur}
                                               />
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Username
                        </Label>
                        <form.AppField name={"username"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <field.TextField
                                                   id={field.name}
                                                   name={field.name}
                                                   className="w-full"
                                                   value={(field.state.value as string) ?? ''}
                                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                                   onBlur={field.handleBlur}
                                               />
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                            Password
                        </Label>
                        <form.AppField name={"password"}
                                       children={(field) => (
                                           <div className="col-span-3 space-y-1">
                                               <field.PasswordField
                                                   id={field.name}
                                                   name={field.name}
                                                   className="w-full"
                                                   value={(field.state.value as string) ?? ''}
                                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                                   onBlur={field.handleBlur}
                                               />
                                               {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                                   <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                               ) : null}
                                           </div>
                                       )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="database" className="text-right">
                            Database
                        </Label>
                        <form.AppField
                            name={"database"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.TextField
                                        id={field.name}
                                        name={field.name}
                                        className="w-full"
                                        value={(field.state.value as string) ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) && field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">{field.state.meta.errors[0]?.message}</p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>

                    {createConnectionMutation.isError ? (
                        <p className="text-sm text-red-500">{(createConnectionMutation.error as any)?.message ?? 'Failed to save connection'}</p>
                    ) : null}

                    <DialogFooter>
                        <form.AppForm>
                            <form.Button type={"submit"} disabled={createConnectionMutation.isPending}>
                                {createConnectionMutation.isPending ? 'Creating...' : 'Create Connection'}
                            </form.Button>
                        </form.AppForm>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default NewConnectionDialog
