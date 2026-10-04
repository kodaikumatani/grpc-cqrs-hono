import { createServer } from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createValidateInterceptor } from "@connectrpc/validate";
import { createDb } from "./db/client.js";
import { errorInterceptor } from "./errors.js";
import { Health } from "./gen/grpc/health/v1/health_pb.js";
import { RecipeService } from "./gen/recipe/recipe_pb.js";
import { healthService } from "./health.js";
import { createRecipeHandler } from "./recipe/handler.js";
import { createRecipeRepository } from "./recipe/repository.js";

const port = Number(process.env.PORT ?? 50051);
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://recipe:recipe@localhost:5432/recipe";

const db = createDb(databaseUrl);

const handler = connectNodeAdapter({
  // gRPC と Connect を受け付ける（gRPC-Web は無効）
  grpcWeb: false,
  interceptors: [createValidateInterceptor(), errorInterceptor],
  routes: (router) => {
    router.service(Health, healthService);
    router.service(RecipeService, createRecipeHandler(createRecipeRepository(db)));
  },
});

createServer(handler).listen(port, () => {
  console.log(`gRPC server listening on :${port}`);
});
