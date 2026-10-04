import type { Recipe } from "./model.js";

// 実装は src/db/recipe.ts
export type RecipeRepository = {
  findById(id: string): Promise<Recipe | undefined>;
  create(recipe: Recipe): Promise<void>;
  update(recipe: Recipe): Promise<void>;
  // 削除した場合は true、対象がなかった場合は false を返す
  delete(id: string): Promise<boolean>;
};
