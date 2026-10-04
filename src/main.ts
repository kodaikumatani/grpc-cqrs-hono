import { createServer } from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { Health } from "./gen/grpc/health/v1/health_pb.js";
import { healthService } from "./health.js";

const port = Number(process.env.PORT ?? 50051);

const handler = connectNodeAdapter({
  routes: (router) => {
    router.service(Health, healthService);
  },
});

createServer(handler).listen(port, () => {
  console.log(`gRPC server listening on :${port}`);
});
