# grpc-cqrs-hono

[grpc-cqrs-go](https://github.com/kodaikumatani/grpc-cqrs-go) の Hono (TypeScript) 版です。
同じ proto 定義を使い、Feature-first + CQRS 構成でレシピとユーザーの管理、
および ReBAC による公開範囲・共有制御を行う API を提供します。

> 🚧 WIP: 現在は proto のみ。実装はこれから。

## 技術スタック（予定）

- **TypeScript / Hono** - アプリケーション
- **Connect RPC** - proto ベースの API（Connect / gRPC-Web プロトコル）
- **Buf** - Protobuf コード生成
- **PostgreSQL** - データベース

## API

proto 定義は `proto/` にあり、Go 版と同一です（`go_package` オプションも Go 版のまま）。

| Service | RPC | 認可 |
| --- | --- | --- |
| `user.UserService` | `CreateUser` | 要認証 |
| `recipe.RecipeService` | `CreateRecipe` | 要認証 |
| | `GetRecipe` | visibility に応じる |
| | `UpdateRecipe` | editor 以上 |
| | `ChangeVisibility` | owner のみ |
| `share.ShareService` | `ShareRecipe` | owner のみ |

認証・認可（ReBAC）・エラー処理の設計方針は Go 版の README を参照してください。
