import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import type { ServiceImpl } from "@connectrpc/connect";
import {
  GetRecipeResponseSchema,
  RecipeSchema,
  type RecipeService,
} from "../gen/recipe/recipe_pb.js";
import { NotFoundError } from "../errors.js";
import type { RecipeRepository } from "./repository.js";

export const createRecipeHandler = (
  repository: RecipeRepository,
): Partial<ServiceImpl<typeof RecipeService>> => ({
  async getRecipe(req) {
    const recipe = await repository.findById(req.id);
    if (!recipe) throw new NotFoundError(`recipe not found: ${req.id}`);

    return create(GetRecipeResponseSchema, {
      recipe: create(RecipeSchema, {
        id: recipe.id,
        userId: recipe.userId,
        title: recipe.title,
        description: recipe.description,
        createdAt: timestampFromDate(recipe.createdAt),
        updatedAt: timestampFromDate(recipe.updatedAt),
      }),
    });
  },
});
