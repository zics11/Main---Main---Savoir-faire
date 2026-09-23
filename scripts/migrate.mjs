// Plain JS (no TS syntax) so it can run in the minimal production image
// with `node`, without pulling tsx/drizzle-kit into the runtime container.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/main-a-main.db";

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Les migrations SQLite qui changent une colonne reconstruisent la table
// (créer / copier / DROP / renommer). better-sqlite3 active les clés
// étrangères par défaut, et le "PRAGMA foreign_keys=OFF" que drizzle place en
// tête du fichier est sans effet : SQLite l'ignore dans une transaction, or
// le migrateur en ouvre une. Sans cette ligne, le DROP TABLE emporte en
// cascade tout ce qui référence la table (stages, dates, témoignages…).
sqlite.pragma("foreign_keys = OFF");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle/migrations" });

// Contrôle de cohérence : si une migration a laissé des références en l'air,
// mieux vaut le savoir maintenant que de découvrir des lignes orphelines.
const cassees = sqlite.pragma("foreign_key_check");
if (cassees.length) {
  console.error("Références cassées après migration :", cassees);
  process.exit(1);
}
sqlite.pragma("foreign_keys = ON");

console.log(`Migrations applied to ${DB_PATH}`);
sqlite.close();
