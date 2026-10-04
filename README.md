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

## JS / TS で gRPC を提供する場合の技術選定

### 結論

| 要件 | 選択肢 |
| --- | --- |
| gRPC のみ提供する（ブラウザから呼ばない） | **Node `http2` + `@connectrpc/connect-node`** |
| gRPC に加えて HTTP エンドポイント（`/metrics`、Webhook など）も必要 | **Fastify + `@connectrpc/connect-fastify`** |
| gRPC が必須で、DI・CQRS などアプリ構成も Framework に任せたい | **NestJS**（`@nestjs/microservices` の `Transport.GRPC`） |
| ブラウザから呼ぶ（Connect / gRPC-Web で足りる） | **Hono** などの fetch API ベースの Framework |

### Hono（fetch API ベース）で gRPC を提供できない理由

gRPC は HTTP/2 上で、処理結果（`grpc-status`）を body の後ろの **trailers** で返す。

```
HEADERS   :status 200, content-type: application/grpc
DATA      [5バイトの長さヘッダー + protobuf メッセージ] ...
HEADERS   grpc-status: 0, grpc-message: ...   ← trailers
```

| gRPC に必要なもの | fetch API（Hono）で可能か | 理由 |
| --- | --- | --- |
| HTTP/2 で通信する | △ ランタイム次第 | サーバーは Hono の外側にある。Bun.serve は HTTP/1.1 のみ。Node は `http2` を渡せる |
| trailers で `grpc-status` を返す | **×** | `Response` が持てるのは `status` / `headers` / `body` のみ。trailers は Fetch の仕様から削除された |

Hono のハンドラは `(req: Request) => Response` であり、trailers を書き込む手段がない。
HTTP/2 にしても解決しないため、これが決定的な理由になる。
Hono の欠陥ではなく、マルチランタイム対応のために Web 標準に寄せた設計とのトレードオフであり、
Cloudflare Workers や `Deno.serve` など fetch API ベースの環境はすべて同じ制約を受ける。

Connect と gRPC-Web は trailers を使わないため、Hono でも提供できる。

| プロトコル | 結果の返し方 | trailers | Hono |
| --- | --- | --- | --- |
| gRPC | HTTP/2 の trailers に `grpc-status` | 必要 | × |
| gRPC-Web | trailers の内容を body の最後のブロックに格納 | 不要 | ○ |
| Connect（unary） | 通常の HTTP ステータス + JSON | 不要 | ○ |

なお、Connect は REST ではなく、proto ベースの RPC プロトコル（`POST /recipe.RecipeService/GetRecipe`）。
gRPC をブラウザや HTTP/1.1 からも呼べるようにしたもので、「REST が不要だから Connect も不要」ではなく、
「ブラウザ / HTTP/1.1 から呼ばないなら Connect / gRPC-Web は不要」と判断する。

#### 検証結果

Hono + 自作の Connect アダプタ（`createFetchHandler`）に対して `buf curl` で検証した。

| プロトコル | Bun（Bun.serve） | Node（`@hono/node-server`） |
| --- | --- | --- |
| Connect | ○ | ○ |
| gRPC-Web | ○ | ○ |
| gRPC（HTTP/2） | ×（`http2: client conn is closed`） | ×（`http2: frame too large`） |

### 構成ごとの比較

| 構成 | HTTP の扱い | Connect | gRPC-Web | gRPC | `protoc-gen-es` の生成コード |
| --- | --- | --- | --- | --- | --- |
| Hono | fetch API | ○ | ○ | × | そのまま使える |
| Node `http2` + `connect-node` | Node `http2` | ○ | ○ | ○ | そのまま使える |
| Fastify + `connect-fastify` | Node `http2` | ○ | ○ | ○ | そのまま使える |
| NestJS（`Transport.GRPC`） | `@grpc/grpc-js` | × | ×（プロキシが必要） | ○ | 使えない（`ts-proto` / `proto-loader` に変更） |

Connect RPC はコアの `@connectrpc/connect` とサーバーごとのアダプタに分かれている。
サービス実装（`router.service(...)`）はアダプタ間で共通なので、起動部分の差し替えだけで移行できる。

| パッケージ | 役割 |
| --- | --- |
| `@connectrpc/connect` | コア。ルーター、サービス実装の型 |
| `@connectrpc/connect-node` | Node 標準の `http` / `http2` サーバー用 |
| `@connectrpc/connect-fastify` | Fastify 用（プラグイン） |
| `@connectrpc/connect-express` | Express 用 |
| `@connectrpc/connect-next` | Next.js 用 |

```ts
// Node http2 + connect-node
import http2 from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";

http2.createServer(connectNodeAdapter({ routes })).listen(8080);
```

```ts
// Fastify + connect-fastify
import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";

const server = fastify({ http2: true });
await server.register(fastifyConnectPlugin, { routes });
await server.listen({ port: 8080 });
```

TLS なしの HTTP/2（h2c）で起動すると HTTP/1.1 の接続は受け付けない。
gRPC クライアントは問題ないが、ブラウザや通常の `curl` からはつながらない。
両方受けたい場合は TLS + `allowHTTP1` にするか、ポートを分ける。

### connect-node と Fastify の使い分け

gRPC のみなら connect-node で十分。

- Fastify の強みは HTTP ルーティングとプラグインで、gRPC のみでは活きない
- 認証・認可（ReBAC）・ログ・エラー変換は Connect の interceptor で書ける
- ヘルスチェックは標準の `grpc.health.v1` を実装すればよい（Kubernetes も gRPC probe に対応）

`/metrics` や Webhook など HTTP エンドポイントが必要になった時点で Fastify に移行すればよい。

### connect-node と `@grpc/grpc-js` の使い分け

| 観点 | connect-node | `@grpc/grpc-js` |
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
// connect-node
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

基本は connect-node を選ぶ。

- `protoc-gen-es` の生成コードとサービス実装をそのまま使える
- async/await で書けるため、CQRS の Command / Query ハンドラとつなぎやすい
- Connect / gRPC-Web が後から必要になっても、作り直さずに設定で対応できる
- gRPC の互換性テストを通しているとされ、Go などの gRPC クライアントからも呼べる想定（本プロジェクトでは未検証）

次の場合は `@grpc/grpc-js` を選ぶ。

- サービスメッシュで xDS を使いたい（Istio などの設定をプロキシを挟まずクライアントが直接受け取る構成）
- reflection（`grpcurl` から定義を読み込む）や channelz（接続状況の確認）など、gRPC 公式の運用機能をそのまま使いたい
- NestJS を使う（内部で使われるため自動的にこちらになる）
- チームに grpc-js の経験があり、実績を重視したい

reflection と health check は connect-node でも自前で実装できる。connect-node 向けの公式パッケージの有無は未確認。

### NestJS と Hono の比較について

NestJS と Hono は分類が異なるため、機能の有無で比べるのは適切ではない。

| 分類 | 例 | 役割 |
| --- | --- | --- |
| フルスタック Framework | Rails、Laravel、Next.js | 画面〜DB まで一式 |
| アプリケーション Framework（opinionated） | **NestJS**、Spring | バックエンドの構成・設計規約まで提供する |
| マイクロ / Web Framework | **Hono**、Express、Fastify | ルーティングとミドルウェアのみ。構成は自分で決める |

NestJS はフルスタックではなく、内部で Express / Fastify を HTTP 層として使う一段上の Framework。
比べるなら「NestJS」対「Hono + 自分で選んだライブラリの組み合わせ」であり、
「規約に乗るか、自分で組むか」の選択になる。

| | NestJS | Hono / Fastify + ライブラリ |
| --- | --- | --- |
| 構成 | Framework が決める | 自分で決める |
| DI | 標準 | 必要なら tsyringe など。手動の組み立てで足りることも多い |
| CQRS | `@nestjs/cqrs` | Command / Query ハンドラを自前で用意 |
| gRPC | 標準対応 | Hono は不可。Fastify は `connect-fastify` で可 |
| Connect / gRPC-Web | 非対応 | 対応 |
| 自由度 | 低い | 高い |
