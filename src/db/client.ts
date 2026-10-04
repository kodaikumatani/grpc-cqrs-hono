import { drizzle } from "drizzle-orm/node-postgres";

export const createDb = (url: string) => drizzle(url, { casing: "snake_case" });

export type Db = ReturnType<typeof createDb>;
