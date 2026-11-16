import pg from "pg";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(currentDir, ".env") });

const { Pool } = pg;

// Reuse database connections instead of reconnecting for every query.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Create our table if it doesn't already exist.
export async function initDb() {
    const sql = readFileSync(
        new URL("./schema.sql", import.meta.url),
        "utf8"
    );

    await pool.query(sql);

    console.log("Database ready");
}