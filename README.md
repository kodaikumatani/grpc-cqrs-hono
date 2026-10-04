# grpc-cqrs-connect

[grpc-cqrs-go](https://github.com/kodaikumatani/grpc-cqrs-go) の TypeScript (Connect RPC) 版です。
同じ proto 定義を使い、Feature-first + CQRS 構成でレシピとユーザーの管理、
および ReBAC による公開範囲・共有制御を行う gRPC API を提供します。

> 🚧 WIP: 現在は proto とコード生成のみ。実装はこれから。

## 技術スタック（予定）

- **TypeScript / Node.js** - アプリケーション
- **Connect RPC**（`@connectrpc/connect-node`）- gRPC サーバー（Node `http2` 上で gRPC プロトコルを提供）
- **Buf / protoc-gen-es** - Protobuf コード生成
- **PostgreSQL** - データベース

技術選定の経緯は [JS / TS で gRPC を提供する場合の技術選定](#js--ts-で-grpc-を提供する場合の技術選定) を参照してください。

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

## JS / TS で gRPC を提供する場合の技術選定

### 比較の軸

技術選定は次の 3 つの層に分かれる。比較は同じ層の選択肢同士で行う。

| 層 | 決めること | 選択肢 |
| --- | --- | --- |
| ① アプリケーション Framework | アプリの構成を Framework に任せるか | NestJS / 使わない（自分で組む） |
| ② gRPC 実装 | gRPC プロトコルを処理するライブラリ | `@grpc/grpc-js` / Connect |
| ③ サーバーの載せ方 | gRPC 実装の周りに HTTP Framework を挟むか | Node `http2` に直接 / Fastify |

②と③の組み合わせは次のとおり。

| | Node `http2` に直接 | Fastify に載せる |
| --- | --- | --- |
| **Connect** | `@connectrpc/connect-node` | `@connectrpc/connect-fastify`（内部で connect-node を使用） |
| **`@grpc/grpc-js`** | `@grpc/grpc-js` | ×（grpc-js は自前で HTTP/2 サーバーを立てるため載せられない） |

①で NestJS を選ぶと、②は `@grpc/grpc-js`（`@nestjs/microservices` の `Transport.GRPC`）に決まり、③は NestJS が管理する。

`@grpc/grpc-js` と connect-fastify のように②と③が同時に異なるものを並べると、何を比べているのかが曖昧になるため避ける。

### 結論

1. **① 構成を Framework に任せるなら NestJS**、自分で組むなら②へ
2. **② gRPC 実装は Connect が基本**。gRPC 公式の運用機能（xDS / reflection / channelz）が必要なら `@grpc/grpc-js`
3. **③ Connect の場合、HTTP エンドポイントが不要なら connect-node**、`/metrics` や Webhook などが必要なら connect-fastify

### ① NestJS を使うメリット・デメリット

NestJS はバックエンドの構成・設計規約まで提供するアプリケーション Framework（Spring に近い）。
gRPC は `@nestjs/microservices` の `Transport.GRPC` で提供し、内部では `@grpc/grpc-js` を使う。

#### gRPC で使える主な機能

| 機能 | 内容 |
| --- | --- |
| `@GrpcMethod` / `@GrpcStreamMethod` | Controller のメソッドを RPC に対応付けるデコレータ |
| DI / Module | Service・Repository などの依存を Framework が組み立てる |
| Guard | RPC の前に認証・認可を判定する。ReBAC の権限チェックの置き場所になる |
| Interceptor | ログ・計測・レスポンス変換など、RPC の前後に共通処理を挟む |
| Pipe | リクエストの検証・変換（`class-validator` など） |
| Exception Filter | 例外を gRPC のステータスコードに変換する（`RpcException`） |
| `@nestjs/cqrs` | CommandBus / QueryBus / EventBus による CQRS |
| Hybrid Application | 1 つのアプリで gRPC と HTTP（`/metrics` など）を別ポートで同時に提供する |
| `@nestjs/testing` | DI のモック差し替えを含むテスト用モジュール |
| 公式連携 | Config、TypeORM / Prisma / MikroORM などの ORM 連携 |

#### メリット

- 認証（Guard）、共通処理（Interceptor）、検証（Pipe）、エラー変換（Exception Filter）の置き場所が決まっており、設計判断が少ない
- `@nestjs/cqrs` があり、このプロジェクトの CQRS 構成をそのまま載せられる
- 規約に沿うため、チーム開発で構成がぶれにくい
- gRPC 実装が `@grpc/grpc-js` なので、gRPC 公式の実績・運用機能をそのまま使える
- 情報量が多い（日本語の記事も含む）

#### デメリット

- gRPC 実装は `@grpc/grpc-js` に固定され、Connect / gRPC-Web は提供できない（ブラウザから呼ぶにはプロキシが必要）
- `protoc-gen-es` の生成コードは使えず、`ts-proto`（`nestJs=true`）か `proto-loader` に変更が必要
- デコレータと DI の学習コスト・記述量がある。小さな API には仕組みが重い
- `emitDecoratorMetadata` に依存するため、esbuild 系（`tsx` など）ではそのままでは DI が動かず、`tsc` か SWC でのビルドが必要
- CommonJS 前提のため、ESM のプロジェクトと組み合わせると手間がかかる場合がある
- 自分で組む構成（Connect + ライブラリ）に比べて自由度は低い

#### 向いているケース

- 認証・認可・CQRS などの構成を Framework の規約に任せたい
- 複数人で開発し、構成の統一を優先したい
- Connect / gRPC-Web が不要で、`@grpc/grpc-js` で問題ない

### ② Connect と `@grpc/grpc-js` の比較

| 観点 | Connect | `@grpc/grpc-js` |
| --- | --- | --- |
| 開発元 | Buf | gRPC 公式 |
| 実績 | 比較的新しい | 長い（事実上の標準） |
| 対応プロトコル | gRPC / gRPC-Web / Connect | gRPC のみ |
| API | async/await | コールバック形式 |
| コード生成 | `protoc-gen-es` | `ts-proto` / `proto-loader` |
| 運用機能 | 自前で用意する部分が多い | reflection / health / channelz / xDS が公式で揃う |

基本は Connect。xDS や reflection など gRPC 公式の運用機能が必要なら `@grpc/grpc-js`。

### ③ connect-node と connect-fastify の比較

gRPC 実装はどちらも Connect。違いは Fastify を挟むかどうかだけ。

| 観点 | connect-node | connect-fastify |
| --- | --- | --- |
| 依存 | 最小 | Fastify 本体 + プラグイン |
| HTTP ルート | 自分で書く | 書ける |
| 構成 | シンプル | 層が一つ増える |

gRPC のみなら connect-node。HTTP エンドポイントが必要になったら、サービス実装はそのままで connect-fastify に移行できる。
