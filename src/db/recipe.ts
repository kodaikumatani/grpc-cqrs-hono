import { and, eq } from "drizzle-orm";
import type { RecipeRepository } from "../recipe/repository.js";
import type { Db } from "./client.js";
import { recipes } from "./schema.js";

export const newRecipeRepository = (db: Db): RecipeRepository => ({
  async findById(id) {
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    return row;
  },

  async findByTitle(userId, title) {
    const [row] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.title, title)));
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
