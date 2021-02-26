import "reflect-metadata";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./UserResolver";
import { createConnection } from "typeorm";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import { User } from "./entity/User";
import { createAccessToken, createRefreshToken } from "./auth";

(async () => {
  const app = express();

  // parsing cookie middleware followed
  app.use(cookieParser());

  // initial route
  app.get("/", (_req, res) => res.send("hello"));

  // refresh token route
  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.token;

    // return empty if token not present
    if (!token) {
      return res.send({ ok: false, accessToken: "" });
    }

    //verify the refresh token a return empty if false
    let payload: any;
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, accessToken: "" });
    }

    //refresh token is valid a access token is returned
    const user = await User.findOne({ id: payload.userId });
    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    // create token if expired
    res.cookie("token", createRefreshToken(user), {
      httpOnly: true,
    });

    return res.send({ ok: true, accessToken: createAccessToken(user) });
  });
  await createConnection();

  const apolloServer = new ApolloServer({
    //building schema
    schema: await buildSchema({
      resolvers: [UserResolver],
    }),
    // request and response is accessible in the context
    context: ({ req, res }) => ({ req, res }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(process.env.PORT || 3000, () => {
    console.log("express server started");
  });
})();
