import { createServer } from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createValidateInterceptor } from "@connectrpc/validate";
import { newDb } from "./db/client.js";
import { newRecipeRepository } from "./db/recipe.js";
import { errorInterceptor } from "./errors.js";
import { Health } from "./gen/grpc/health/v1/health_pb.js";
import { RecipeService } from "./gen/recipe/recipe_pb.js";
import { healthService } from "./health.js";
import { newRecipeHandler } from "./recipe/handler.js";

const port = Number(process.env.PORT ?? 50051);
const databaseUrl = process.env.DATABASE_URL ?? "postgres://recipe:recipe@localhost:5432/recipe";

const db = newDb(databaseUrl);

const handler = connectNodeAdapter({
  // gRPC と Connect を受け付ける（gRPC-Web は無効）
  grpcWeb: false,
  interceptors: [errorInterceptor, createValidateInterceptor()],
  routes: (router) => {
    router.service(Health, healthService);
    router.service(RecipeService, newRecipeHandler(newRecipeRepository(db)));
  },
});

createServer(handler).listen(port, () => {
  console.log(`gRPC server listening on :${port}`);
});
