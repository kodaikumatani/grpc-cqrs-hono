import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { recipes } from "../db/schema.js";
import type { Recipe } from "./model.js";

export type RecipeRepository = {
  findById(id: string): Promise<Recipe | undefined>;
  create(recipe: Recipe): Promise<void>;
};

export const createRecipeRepository = (db: Db): RecipeRepository => ({
  async findById(id) {
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    return row;
  },
  async create(recipe) {
    await db.insert(recipes).values(recipe);
  },
});
