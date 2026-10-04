import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";

export class NotFoundError extends Error {}
export class UnauthenticatedError extends Error {}

// アプリのエラーを ConnectError に変換する
export const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (e) {
    if (e instanceof NotFoundError) throw new ConnectError(e.message, Code.NotFound);
    if (e instanceof UnauthenticatedError) throw new ConnectError(e.message, Code.Unauthenticated);
    throw e;
  }
};
