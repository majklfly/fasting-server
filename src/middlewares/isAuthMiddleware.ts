import { MiddlewareFn } from "type-graphql";
import { Request, Response } from "express";
import { verify } from "jsonwebtoken";

interface Context {
  req: Request | any;
  res: Response;
  payload?: { userId: string };
}

export const isAuth: MiddlewareFn<Context> = ({ context }, next) => {
  // TODO: insert authorization token to the header on client side
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    throw new Error("not authenticated");
  }

  // verifying token from header
  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    context.payload = payload as any;
  } catch (e) {
    console.log(e);
  }

  // next means done with middleware and continue
  return next();
};
