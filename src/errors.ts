import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";

// エラーをログに残す。handler が投げた ConnectError（既知のエラー）は warn、
// それ以外の想定外のエラーは error で記録し、クライアントには中身を返さない
export const errorInterceptor: Interceptor = (next) => async (req) => {
  const rpc = `${req.service.typeName}/${req.method.name}`;
  try {
    return await next(req);
  } catch (e) {
    if (e instanceof ConnectError) {
      console.warn(`${rpc}: ${Code[e.code]}: ${e.rawMessage}`);
      throw e;
    }
    console.error(`unexpected error in ${rpc}`, e);
    throw new ConnectError("internal error", Code.Internal);
  }
};
