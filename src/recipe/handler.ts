import { randomUUID } from "node:crypto";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import type { RecipeService } from "../gen/recipe/recipe_pb.js";
import type { Recipe } from "./model.js";
import type { RecipeRepository } from "./repository.js";

export const newRecipeHandler = (
  repository: RecipeRepository,
): ServiceImpl<typeof RecipeService> => ({
  async createRecipe(req, ctx) {
    const userId = ctx.requestHeader.get("x-user-id");
    if (!userId) throw new ConnectError("x-user-id is required", Code.Unauthenticated);

    const now = new Date();
    const recipe: Recipe = {
      id: randomUUID(),
      userId,
      title: req.title,
      description: req.description,
      createdAt: now,
      updatedAt: now,
    };
    await repository.create(recipe);

    return { recipeId: recipe.id };
  },

  async getRecipe(req) {
    const recipe = await repository.findById(req.id);
    if (!recipe) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    return {
      recipe: {
        id: recipe.id,
        userId: recipe.userId,
        title: recipe.title,
        description: recipe.description,
        createdAt: timestampFromDate(recipe.createdAt),
        updatedAt: timestampFromDate(recipe.updatedAt),
      },
    };
  },

  async updateRecipe(req) {
    const recipe = await repository.findById(req.id);
    if (!recipe) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    const updated: Recipe = {
      ...recipe,
      title: req.title,
      description: req.description,
      updatedAt: new Date(),
    };
    await repository.update(updated);

    return { success: true };
  },

  async deleteRecipe(req) {
    const deleted = await repository.delete(req.id);
    if (!deleted) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    return {};
  },
});
