/**
 * Deletes the local SQLite database so the next server start reseeds demo data.
 * Refuses to run in production.
 */
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset the database with NODE_ENV=production.");
  process.exit(1);
}

const root = process.cwd();
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(root, process.env.DATABASE_PATH)
  : path.join(root, "server", "data", "nagarmitra.db");

for (const suffix of ["", "-wal", "-shm"]) {
  const target = `${dbPath}${suffix}`;
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    console.log(`Removed ${target}`);
  }
}
console.log("Database reset. The next server start will reseed demo data.");
