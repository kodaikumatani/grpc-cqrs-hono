import { RecipeNotOwnedError, RecipeTitleTakenError } from "./errors.js";
import type { RecipeRepository } from "./repository.js";

export type Recipe = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

// Recipe に対する操作。型と同じ名前にして Recipe(repository).xxx(recipe) の形で呼ぶ
export const Recipe = (repository: RecipeRepository) => ({
  // 作成者しかレシピを変更できない（レシピ 1 つで判断できるため repository は使わない）
  ensureOwnedBy(recipe: Recipe, userId: string): void {
    if (recipe.userId !== userId) throw RecipeNotOwnedError();
  },

  // 同じユーザーは同じタイトルのレシピを持てない（recipe 自身は重複とみなさない）
  // レシピ 1 つでは判断できないため、repository に問い合わせる
  async ensureTitleAvailable(recipe: Recipe): Promise<void> {
    const sameTitle = await repository.findByTitle(recipe.userId, recipe.title);
    if (sameTitle && sameTitle.id !== recipe.id) throw RecipeTitleTakenError();
  },
});
