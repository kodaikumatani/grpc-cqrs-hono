import { drizzle } from "drizzle-orm/node-postgres";

export const newDb = (url: string) => drizzle(url, { casing: "snake_case" });

export type Db = ReturnType<typeof newDb>;
