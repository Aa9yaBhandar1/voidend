import { type Config } from "drizzle-kit";
import { getDataDir } from "./src/lib/endpoint-data-store";
import path from "path";
import fs from "fs";

const dbDir = getDataDir();
fs.mkdirSync(dbDir, { recursive: true });

export default {
    schema: "./src/server/db/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: path.join(dbDir, "voidend.db"),
    },
    tablesFilter: ["voidend_*"],
} satisfies Config;
