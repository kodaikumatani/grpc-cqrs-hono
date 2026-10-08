import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";

// Code ごとのログレベル。クライアント側の問題は warn、サーバー側の問題は error
// Record なので、Code の分類漏れはコンパイルエラーになる
const logLevel: Record<Code, "warn" | "error"> = {
  [Code.InvalidArgument]: "warn",
  [Code.NotFound]: "warn",
  [Code.AlreadyExists]: "warn",
  [Code.PermissionDenied]: "warn",
  [Code.Unauthenticated]: "warn",
  [Code.FailedPrecondition]: "warn",
  [Code.OutOfRange]: "warn",
  [Code.Canceled]: "warn",
  [Code.Internal]: "error",
  [Code.Unknown]: "error",
  [Code.Unavailable]: "error",
  [Code.DataLoss]: "error",
  [Code.DeadlineExceeded]: "error",
  [Code.ResourceExhausted]: "error",
  [Code.Unimplemented]: "error",
  [Code.Aborted]: "error",
};

// エラーをログに残す。ConnectError は Code に応じて warn / error を切り替え、
// それ以外の想定外のエラーは error で記録し、クライアントには中身を返さない
export const errorInterceptor: Interceptor = (next) => async (req) => {
  const rpc = `${req.service.typeName}/${req.method.name}`;
  try {
    return await next(req);
  } catch (e) {
    if (e instanceof ConnectError) {
      console[logLevel[e.code]](`${rpc}: ${Code[e.code]}: ${e.rawMessage}`);
      throw e;
    }
    console.error(`unexpected error in ${rpc}`, e);
    throw new ConnectError("internal error", Code.Internal);
  }
};
