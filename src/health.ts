import { create } from "@bufbuild/protobuf";
import type { ServiceImpl } from "@connectrpc/connect";
import {
  type Health,
  HealthCheckResponse_ServingStatus,
  HealthCheckResponseSchema,
} from "./gen/grpc/health/v1/health_pb.js";

// Check のみ実装する。List / Watch は Connect が UNIMPLEMENTED を返す
export const healthService: Partial<ServiceImpl<typeof Health>> = {
  check: () =>
    create(HealthCheckResponseSchema, {
      status: HealthCheckResponse_ServingStatus.SERVING,
    }),
};
