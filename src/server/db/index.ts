import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { getDataDir } from "~/lib/endpoint-data-store";

const dbDir = getDataDir();
fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(path.join(dbDir, "voidend.db"));
export const db = drizzle(sqlite, { schema });
