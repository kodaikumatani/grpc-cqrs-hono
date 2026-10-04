import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { recipes } from "../db/schema.js";
import type { Recipe } from "./model.js";

export type RecipeRepository = {
  findById(id: string): Promise<Recipe | undefined>;
  create(recipe: Recipe): Promise<void>;
  update(recipe: Recipe): Promise<void>;
  // 削除した場合は true、対象がなかった場合は false を返す
  delete(id: string): Promise<boolean>;
};

export const newRecipeRepository = (db: Db): RecipeRepository => ({
  async findById(id) {
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    return row;
  },
  async create(recipe) {
    await db.insert(recipes).values(recipe);
  },
  async update(recipe) {
    await db
      .update(recipes)
      .set({ title: recipe.title, description: recipe.description, updatedAt: recipe.updatedAt })
      .where(eq(recipes.id, recipe.id));
  },
  async delete(id) {
    const rows = await db.delete(recipes).where(eq(recipes.id, id)).returning({ id: recipes.id });
    return rows.length > 0;
  },
});
