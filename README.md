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

### ① NestJS と自分で組む構成の比較

NestJS とマイクロ / Web Framework は分類が異なるため、機能の有無で比べるのは適切ではない。

| 分類 | 例 | 役割 |
| --- | --- | --- |
| フルスタック Framework | Rails、Laravel、Next.js | 画面〜DB まで一式 |
| アプリケーション Framework（opinionated） | **NestJS**、Spring | バックエンドの構成・設計規約まで提供する |
| マイクロ / Web Framework | Hono、Express、Fastify | ルーティングとミドルウェアのみ。構成は自分で決める |

NestJS はフルスタックではなく、内部で Express / Fastify を HTTP 層として使う一段上の Framework。
比べるなら「NestJS」対「gRPC 実装 + 自分で選んだライブラリの組み合わせ」であり、
「規約に乗るか、自分で組むか」の選択になる。

| | NestJS | 自分で組む（connect-node など + ライブラリ） |
| --- | --- | --- |
| 構成 | Framework が決める | 自分で決める |
| DI | 標準 | 必要なら tsyringe など。手動の組み立てで足りることも多い |
| CQRS | `@nestjs/cqrs` | Command / Query ハンドラを自前で用意 |
| gRPC 実装 | `@grpc/grpc-js` に固定 | Connect / `@grpc/grpc-js` から選べる |
| コード生成 | `ts-proto` / `proto-loader` | gRPC 実装に合わせて選ぶ（Connect なら `protoc-gen-es`） |
| 自由度 | 低い | 高い |

### ② Connect と `@grpc/grpc-js` の比較

| 観点 | Connect | `@grpc/grpc-js` |
| --- | --- | --- |
| 開発元 | Buf | gRPC 公式（grpc.io） |
| 実績 | 比較的新しい（v2） | 長い。Node の gRPC の事実上の標準で、NestJS も内部で使用 |
| 対応プロトコル | gRPC / gRPC-Web / Connect | gRPC のみ |
| API | async/await。ストリーミングは async iterable | コールバック形式（`call`, `callback`） |
| コード生成 | `protoc-gen-es` | `proto-loader`（実行時読み込み・型なし）か `ts-proto` など |
| 型安全性 | 生成コードと実装の型が自然につながる | 生成方法の選び方次第 |
| 共通処理 | interceptor | interceptor（サーバー側の対応は比較的最近） |
| 運用まわり | 自前で用意する部分が多い | reflection / health / channelz / xDS などの公式パッケージがある |

```ts
// Connect
router.service(UserService, {
  async createUser(req) {
    const id = await createUser(req.name, req.email);
    return { userId: id };
  },
});
```

```ts
// @grpc/grpc-js
server.addService(UserServiceService, {
  createUser(call, callback) {
    createUser(call.request.name, call.request.email)
      .then((id) => callback(null, { userId: id }))
      .catch((err) => callback(err));
  },
});
```

基本は Connect を選ぶ。

- `protoc-gen-es` の生成コードとサービス実装をそのまま使える
- async/await で書けるため、CQRS の Command / Query ハンドラとつなぎやすい
- Connect / gRPC-Web が後から必要になっても、作り直さずに設定で対応できる
- gRPC の互換性テストを通しているとされ、Go などの gRPC クライアントからも呼べる想定（本プロジェクトでは未検証）

次の場合は `@grpc/grpc-js` を選ぶ。

- サービスメッシュで xDS を使いたい（Istio などの設定をプロキシを挟まずクライアントが直接受け取る構成）
- reflection（`grpcurl` から定義を読み込む）や channelz（接続状況の確認）など、gRPC 公式の運用機能をそのまま使いたい
- チームに grpc-js の経験があり、実績を重視したい

reflection と health check は Connect でも自前で実装できる。Connect 向けの公式パッケージの有無は未確認。

### ③ connect-node と connect-fastify の比較

gRPC 実装はどちらも Connect で同じ。違いは Fastify を挟むかどうかだけ。

| 観点 | connect-node | connect-fastify |
| --- | --- | --- |
| 依存 | `@connectrpc/connect-node` のみ | Fastify 本体 + プラグイン |
| 通常の HTTP ルート | 自分で書く | 書ける |
| 共通処理 | Connect の interceptor | interceptor か Fastify の hook |
| ログ | 自分で選ぶ（pino など） | pino が標準で付属 |
| 構成の単純さ | ◎ | ○（層が一つ増える） |

```ts
// connect-node
import http2 from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";

http2.createServer(connectNodeAdapter({ routes })).listen(8080);
```

```ts
// connect-fastify
import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";

const server = fastify({ http2: true });
await server.register(fastifyConnectPlugin, { routes });
server.get("/health", () => "ok");
await server.listen({ port: 8080 });
```

gRPC のみなら connect-node で十分。

- Fastify の強みは HTTP ルーティングとプラグインで、gRPC のみでは活きない
- 認証・認可（ReBAC）・ログ・エラー変換は Connect の interceptor で書ける
- ヘルスチェックは標準の `grpc.health.v1` を実装すればよい（Kubernetes も gRPC probe に対応）

サービス実装（`router.service(...)`）は共通なので、HTTP エンドポイントが必要になった時点で起動部分だけ差し替えて connect-fastify に移行できる。

### 補足: Connect のパッケージ構成

| パッケージ | 役割 |
| --- | --- |
| `@connectrpc/connect` | コア。ルーター、サービス実装の型 |
| `@connectrpc/connect-node` | Node 標準の `http` / `http2` サーバー用 |
| `@connectrpc/connect-fastify` | Fastify 用（プラグイン） |
| `@connectrpc/connect-express` | Express 用 |
| `@connectrpc/connect-next` | Next.js 用 |

### 補足: TLS なしの HTTP/2

TLS なしの HTTP/2（h2c）で起動すると HTTP/1.1 の接続は受け付けない。
gRPC クライアントは問題ないが、ブラウザや通常の `curl` からはつながらない。
両方受けたい場合は TLS + `allowHTTP1` にするか、ポートを分ける。
