// 同じユーザーが同じタイトルのレシピを持とうとした
export type RecipeTitleTakenError = Error & { readonly name: "RecipeTitleTakenError" };

export const recipeTitleTakenError = (): RecipeTitleTakenError =>
  Object.assign(new Error("recipe title already exists"), {
    name: "RecipeTitleTakenError" as const,
  });

export const isRecipeTitleTakenError = (e: unknown): e is RecipeTitleTakenError =>
  e instanceof Error && e.name === "RecipeTitleTakenError";
