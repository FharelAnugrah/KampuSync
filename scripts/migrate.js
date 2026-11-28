import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
function loadEnvFile(filename) {
    const filepath = join(process.cwd(), filename);
    if (!existsSync(filepath))
        return;
    const lines = readFileSync(filepath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex <= 0)
            continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }
}
async function run() {
    loadEnvFile(".env.local");
    loadEnvFile(".env");
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Error: DATABASE_URL is not configured.");
        process.exit(1);
    }
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version varchar(100) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        const migrationsDir = join(process.cwd(), "db", "migrations");
        const files = readdirSync(migrationsDir)
            .filter((f) => f.endsWith(".sql"))
            .sort();
        for (const file of files) {
            const existing = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
            if (existing.rowCount && existing.rowCount > 0) {
                console.log(`[skip] ${file}`);
                continue;
            }
            const sql = readFileSync(join(migrationsDir, file), "utf-8");
            console.log(`[apply] ${file}...`);
            await client.query("BEGIN");
            try {
                await client.query(sql);
                await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
                await client.query("COMMIT");
                console.log(`[done] ${file}`);
            }
            catch (err) {
                await client.query("ROLLBACK");
                throw err;
            }
        }
        console.log("All migrations are up to date.");
    }
    finally {
        client.release();
        await pool.end();
    }
}
run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
