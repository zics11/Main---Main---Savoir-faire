// Plain JS (no TS syntax) so it can run in the minimal production image
// with `node`, without pulling tsx/drizzle-kit into the runtime container.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/main-a-main.db";

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle/migrations" });

console.log(`Migrations applied to ${DB_PATH}`);
sqlite.close();
