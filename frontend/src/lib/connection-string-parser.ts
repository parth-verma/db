export function parseConnectionString(input: string): null | {
    type: "postgres" | "mysql";
    host: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
} {
    try {
        const trimmed = input.trim();
        if (!/^\w+:\/\//.test(trimmed)) return null;

        // Normalize common schemes
        const lowered = trimmed.toLowerCase();
        let type: "postgres" | "mysql" | null = null;
        if (lowered.startsWith("postgresql://") || lowered.startsWith("postgres://")) {
            type = "postgres";
        } else if (lowered.startsWith("mysql://")) {
            type = "mysql";
        } else {
            // Unknown scheme, bail
            return null;
        }

        const url = new URL(trimmed);

        const username = url.username ? decodeURIComponent(url.username) : undefined;
        const password = url.password ? decodeURIComponent(url.password) : undefined;

        // Host: may include IPv6 in [::1]
        const host = url.hostname || "";

        // Port
        let port: number | undefined;
        if (url.port) {
            const p = Number(url.port);
            if (!Number.isNaN(p)) port = p;
        }
        if (!port) {
            port = type === "postgres" ? 5432 : 3306;
        }

        // Database name: first segment of pathname without leading '/'
        let database: string | undefined;
        const path = url.pathname || "";
        if (path && path !== "/") {
            database = decodeURIComponent(path.replace(/^\//, ""));
        }
        // Fallbacks from query
        if (!database) {
            const params = url.searchParams;
            database = params.get("database") || params.get("dbname") || undefined;
        }

        return { type, host, port, username, password, database };
    } catch (e) {
        return null;
    }
}