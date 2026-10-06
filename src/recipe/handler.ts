import { randomUUID } from "node:crypto";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import type { RecipeService } from "../gen/recipe/recipe_pb.js";
import { RecipeNotOwnedError, RecipeTitleTakenError } from "./errors.js";
import { Recipe } from "./model.js";
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

    try {
      await Recipe(repository).ensureTitleAvailable(recipe);
    } catch (e) {
      if (RecipeTitleTakenError.is(e)) throw new ConnectError(e.message, Code.AlreadyExists);
      throw e;
    }
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

  async updateRecipe(req, ctx) {
    const userId = ctx.requestHeader.get("x-user-id");
    if (!userId) throw new ConnectError("x-user-id is required", Code.Unauthenticated);

    const recipe = await repository.findById(req.id);
    if (!recipe) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    const updated: Recipe = {
      ...recipe,
      title: req.title,
      description: req.description,
      updatedAt: new Date(),
    };
    try {
      Recipe(repository).ensureOwnedBy(recipe, userId);
      await Recipe(repository).ensureTitleAvailable(updated);
    } catch (e) {
      if (RecipeNotOwnedError.is(e)) throw new ConnectError(e.message, Code.PermissionDenied);
      if (RecipeTitleTakenError.is(e)) throw new ConnectError(e.message, Code.AlreadyExists);
      throw e;
    }
    await repository.update(updated);

    return { success: true };
  },

  async deleteRecipe(req, ctx) {
    const userId = ctx.requestHeader.get("x-user-id");
    if (!userId) throw new ConnectError("x-user-id is required", Code.Unauthenticated);

    const recipe = await repository.findById(req.id);
    if (!recipe) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    try {
      Recipe(repository).ensureOwnedBy(recipe, userId);
    } catch (e) {
      if (RecipeNotOwnedError.is(e)) throw new ConnectError(e.message, Code.PermissionDenied);
      throw e;
    }
    const deleted = await repository.delete(recipe.id);
    if (!deleted) throw new ConnectError(`recipe not found: ${req.id}`, Code.NotFound);

    return {};
  },
});
