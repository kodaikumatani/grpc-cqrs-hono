// 呼ぶとエラーを作り、is で見分けられる関数を定義する（作る処理と見分ける処理を必ずセットにする）
const defineError = <N extends string>({ name, message }: { name: N; message: string }) =>
  Object.assign(() => Object.assign(new Error(message), { name }), {
    is: (e: unknown): e is Error & { name: N } => e instanceof Error && e.name === name,
  });

// 同じユーザーが同じタイトルのレシピを持とうとした
export const RecipeTitleTakenError = defineError({
  name: "RecipeTitleTakenError",
  message: "recipe title already exists",
});

// 作成者以外がレシピを変更しようとした
export const RecipeNotOwnedError = defineError({
  name: "RecipeNotOwnedError",
  message: "recipe is not owned by the user",
});
