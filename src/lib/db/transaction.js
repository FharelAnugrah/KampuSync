import { getPool } from "./pool";
/**
 * Executes a callback inside a PostgreSQL transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (error) {
        try {
            await client.query("ROLLBACK");
        }
        catch (rollbackError) {
            console.error("Failed to rollback transaction:", rollbackError);
        }
        throw error;
    }
    finally {
        client.release();
    }
}
