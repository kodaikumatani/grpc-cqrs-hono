import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";

export class NotFoundError extends Error {}

// アプリのエラーを ConnectError に変換する
export const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (e) {
    if (e instanceof NotFoundError) throw new ConnectError(e.message, Code.NotFound);
    throw e;
  }
};
