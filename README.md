# recipe-grpc-connect

レシピの管理を行う gRPC API を、TypeScript と Connect RPC で提供します。

## 技術スタック

- **TypeScript / Node.js** - アプリケーション
- **Connect RPC**（`@connectrpc/connect-node`）- gRPC サーバー（Node `http2` 上で gRPC プロトコルを提供）
- **Buf / protoc-gen-es** - Protobuf コード生成
- **protovalidate**（`@connectrpc/validate`）- proto に書いたルールでリクエストを検証
- **PostgreSQL** - データベース
- **Drizzle ORM** - DB アクセスとマイグレーション
- **Biome** - lint / format

技術選定の経緯は [JS / TS で gRPC を提供する場合の技術選定](#js--ts-で-grpc-を提供する場合の技術選定) を参照してください。

## API

proto 定義は `proto/` にあります。grpc-cqrs-go から `UserService` / `ShareService` と `GetRecipe` の作成者情報（`User`）を削除しています。

| Service | RPC | 内容 | `x-user-id` |
| --- | --- | --- | --- |
| `recipe.RecipeService` | `CreateRecipe` | レシピを作成（作成者 = `x-user-id`） | 必須 |
| | `GetRecipe` | レシピを取得 | 不要 |
| | `UpdateRecipe` | タイトル・説明を更新（作成者のみ） | 必須 |
| | `DeleteRecipe` | レシピを削除（作成者のみ） | 必須 |

## 実装スタイル

class は意図的に使わず、factory 関数とクロージャで実装します。

```ts
export const newRecipeHandler = (repository: RecipeRepository) => ({
  async getRecipe(req) {
    const recipe = await repository.findById(req.id);
    // ...
  },
});
```

- 依存は factory 関数の引数で受け取り、`this` ではなくクロージャで保持する
- 型は `type` で定義する（abstract class や interface の実装 class は作らない）
- デコレータは使わない

### class を使わない理由

- `this` の束縛を気にしなくてよい（メソッドを取り出して渡しても壊れない）
- DI のためのデコレータ（`experimentalDecorators` / `emitDecoratorMetadata`）が不要で、`tsx`（esbuild）でもそのまま動く
- テストでは factory 関数にモックを渡すだけで差し替えられる

## JS / TS で gRPC を提供する場合の技術選定

| 観点 | NestJS | `@grpc/grpc-js` | connect-node | connect-fastify |
| --- | --- | --- | --- | --- |
| 概要 | アプリケーション Framework（内部は grpc-js） | gRPC 公式実装 | Connect を Node `http2` に直接載せる | Connect を Fastify に載せる |
| 対応プロトコル | gRPC | gRPC | gRPC / gRPC-Web / Connect | gRPC / gRPC-Web / Connect |
| コード生成 | `ts-proto` / `proto-loader` | `ts-proto` / `proto-loader` | `protoc-gen-es` | `protoc-gen-es` |
| RPC 以外の HTTP エンドポイント | 書ける | 書けない | 自分で書く | 書ける |
| 運用機能（reflection / channelz / xDS） | grpc-js のものを使える | 公式で揃う | 自前で用意 | 自前で用意 |
| 構成の自由度 | 低い（規約に従う） | 高い | 高い | 高い |
| 注意点 | デコレータ・DI 前提、`tsx` では DI が動かない、CommonJS 前提 | コールバック形式の API | 依存は最小 | Fastify の分だけ層が増える |
| 向いているケース | 構成を規約に任せたい、チーム開発 | gRPC 公式の運用機能が必要 | RPC だけ提供する | `/metrics` や Webhook など RPC 以外の HTTP も必要 |

### 結論

- 基本は **connect-node**。このリポジトリもこれを使う
- `/metrics` や Webhook など RPC 以外の HTTP エンドポイントが必要になったら **connect-fastify** に移行する（サービス実装はそのまま使える）
- RPC は Connect プロトコルで HTTP POST + JSON でも呼べるため、JSON で呼べるようにするためだけに REST を別に作る必要はない
- gRPC 公式の運用機能が必要なら **`@grpc/grpc-js`**
- 構成を Framework の規約に任せたいなら **NestJS**
