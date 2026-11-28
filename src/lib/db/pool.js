import { Pool } from "pg";
function createPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set. Configure it in .env.local (see .env.example).");
    }
    const pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (error) => {
        console.error("Unexpected PostgreSQL pool error:", error);
    });
    return pool;
}
export function getPool() {
    if (!globalThis.__kampusyncPool) {
        globalThis.__kampusyncPool = createPool();
    }
    return globalThis.__kampusyncPool;
}
export async function query(text, params = []) {
    return getPool().query(text, params);
}
