import React from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {useQueryClient, useMutation} from "@tanstack/react-query";
import {
    DBConnectionService,
} from "@/main";
import type {
    DBConnection as DatabaseConnection,
} from '@/main/utils'
import {createFormHook, createFormHookContexts} from "@tanstack/react-form";
import {z} from "zod";
import {PasswordInput} from "@/components/ui/password-input.tsx";
import {parseConnectionString} from "@/lib/connection-string-parser.ts";

export type NewConnectionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (conn: DatabaseConnection) => void;
    mode?: "create" | "edit";
    initial?: DatabaseConnection | null;
};

const {fieldContext, formContext} = createFormHookContexts();
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
});

const mysqlSchema = z.object({
    name: z.string().min(1),
    type: z.literal("mysql"),
    host: z.string(),
    port: z.number().optional().default(3306),
    username: z.string(),
    password: z.string().optional(),
    database: z.string(),
});

const postgresSchema = z.object({
    name: z.string().min(1),
    type: z.literal("postgres"),
    host: z.string(),
    port: z.number().optional().default(5432),
    username: z.string(),
    password: z.string().optional(),
    database: z.string(),
});

const schema = z.discriminatedUnion("type", [mysqlSchema, postgresSchema]);

const defaultCreateValues: z.input<typeof schema> = {
    name: "",
    type: "mysql",
    host: "",
    port: 3306,
    username: "",
    password: "",
    database: "",
};

export function NewConnectionDialog({
                                        open,
                                        onOpenChange,
                                        onCreated,
                                        mode = "create",
                                        initial,
                                    }: NewConnectionDialogProps) {
    const queryClient = useQueryClient();

    const usedDefaults: z.input<typeof schema> = initial
        ? {
            name: initial.name,
            type: initial.type === "postgres" ? "postgres" : "mysql",
            host: initial.host,
            port: initial.port,
            username: initial.username,
            password: initial.password ?? "",
            database: initial.database,
        }
        : defaultCreateValues;

    const saveConnectionMutation = useMutation({
        mutationKey: [mode === "edit" ? "edit-connection" : "create-connection"],
        mutationFn: async (value: DatabaseConnection) => {
            // Ensure ID is present when editing, even if caller forgot to pass it
            const payload: DatabaseConnection = {...value} as DatabaseConnection;
            if (mode === "edit" && initial?.id && !payload.id) {
                payload.id = initial.id;
            }
            await DBConnectionService.TestConnection(payload);
            await DBConnectionService.SaveConnection(payload);
            return payload;
        },
        onSuccess: async (conn) => {
            await queryClient.invalidateQueries({queryKey: ["connections"]});
            onOpenChange(false);
            toast.success("Success", {
                description:
                    mode === "edit"
                        ? "Connection updated successfully"
                        : "Connection created successfully",
            });
            onCreated?.(conn);
        },
    });

    const form = useAppForm({
        defaultValues: usedDefaults,
        validators: {
            onSubmit: schema,
        },
        onSubmitInvalid: (errors) => {
            console.log("errors", errors);
        },
        onSubmit: async ({value}) => {
            const port = value.port ?? (value.type === "postgres" ? 5432 : 3306);
            const conn: DatabaseConnection = {
                id: mode === "edit" && initial ? initial.id : crypto.randomUUID(),
                name: value.name,
                type: value.type as string,
                host: value.host as string,
                port,
                username: value.username as string,
                password: value.password ?? "",
                database: value.database as string,
                sslmode: "prefer"
            };
            await saveConnectionMutation.mutateAsync(conn);
        },
    });

    const applyParsedToForm = (parsed: NonNullable<ReturnType<typeof parseConnectionString>>) => {
        form.setFieldValue('type', parsed.type);
        form.setFieldValue('host', parsed.host);
        form.setFieldValue("port", parsed.port ?? (parsed.type === 'postgres' ? 5432 : 3306));
        form.setFieldValue("username", parsed.username ?? '');
        form.setFieldValue("password", parsed.password ?? '');
        form.setFieldValue("database", parsed.database ?? '');
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) {
                    form.reset();
                }
                onOpenChange(open);
            }}
        >
            <DialogContent>
                <form
                    autoComplete="off"
                    className="grid gap-4 py-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "edit" ? "Edit Connection" : "Create New Connection"}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the details for your database connection.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <form.AppField
                            name={"name"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.TextField
                                        id={field.name}
                                        name={field.name}
                                        className="w-full"
                                        placeholder={"My Database"}
                                        value={(field.state.value as string) ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <form.AppField
                            name={"type"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <Select
                                        name={field.name}
                                        value={field.state.value as string}
                                        // @ts-expect-error - on value change is not typed based on select items
                                        onValueChange={field.handleChange}
                                    >
                                        <SelectTrigger id={field.name} onBlur={field.handleBlur}>
                                            <SelectValue placeholder="Select database type"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="postgres">PostgreSQL</SelectItem>
                                            <SelectItem value="mysql">MySQL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="host" className="text-right">
                            Host
                        </Label>
                        <form.AppField
                            name={"host"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.TextField
                                        id={field.name}
                                        name={field.name}
                                        className="w-full"
                                        value={(field.state.value as string) ?? ""}
                                        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                                            const pasted = e.clipboardData.getData('text');
                                            const parsed = parseConnectionString(pasted);
                                            if (!parsed){
                                                return
                                            }
                                            e.preventDefault();
                                            applyParsedToForm(parsed);
                                        }}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            field.handleChange(e.target.value)
                                        }}
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="port" className="text-right">
                            Port
                        </Label>
                        <form.AppField
                            name={"port"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.TextField
                                        id={field.name}
                                        name={field.name}
                                        type="number"
                                        className="w-full"
                                        value={field.state.value ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const v = e.target.value;
                                            field.handleChange(v === "" ? undefined : Number(v));
                                        }}
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Username
                        </Label>
                        <form.AppField
                            name={"username"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.TextField
                                        id={field.name}
                                        name={field.name}
                                        className="w-full"
                                        value={(field.state.value as string) ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                            Password
                        </Label>
                        <form.AppField
                            name={"password"}
                            children={(field) => (
                                <div className="col-span-3 space-y-1">
                                    <field.PasswordField
                                        id={field.name}
                                        name={field.name}
                                        className="w-full"
                                        value={(field.state.value as string) ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
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
                                        value={(field.state.value as string) ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {(field.state.meta.isTouched || form.state.isSubmitted) &&
                                    field.state.meta.errors?.length ? (
                                        <p className="text-sm text-red-500">
                                            {field.state.meta.errors[0]?.message}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        />
                    </div>

                    {saveConnectionMutation.isError ? (
                        <p className="text-sm text-red-500">
                            {(saveConnectionMutation.error as Error)?.message ??
                                (mode === "edit"
                                    ? "Failed to update connection"
                                    : "Failed to save connection")}
                        </p>
                    ) : null}

                    <DialogFooter>
                        <form.AppForm>
                            <form.Button
                                type={"submit"}
                                disabled={saveConnectionMutation.isPending}
                            >
                                {saveConnectionMutation.isPending
                                    ? mode === "edit"
                                        ? "Saving..."
                                        : "Creating..."
                                    : mode === "edit"
                                        ? "Save Changes"
                                        : "Create Connection"}
                            </form.Button>
                        </form.AppForm>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default NewConnectionDialog;
