// name で種類を見分けるエラー
type NamedError<N extends string> = Error & { readonly name: N };

// 呼ぶとエラーを作り、is で見分けられる関数を定義する（作る処理と見分ける処理を必ずセットにする）
const defineError = <N extends string>(name: N, message: string) =>
  Object.assign((): NamedError<N> => Object.assign(new Error(message), { name }), {
    is: (e: unknown): e is NamedError<N> => e instanceof Error && e.name === name,
  });

// 同じユーザーが同じタイトルのレシピを持とうとした
export const RecipeTitleTakenError = defineError(
  "RecipeTitleTakenError",
  "recipe title already exists",
);

// 作成者以外がレシピを変更しようとした
export const RecipeNotOwnedError = defineError(
  "RecipeNotOwnedError",
  "recipe is not owned by the user",
);
