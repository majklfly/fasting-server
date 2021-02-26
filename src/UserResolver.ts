import {
  Resolver,
  Query,
  Mutation,
  Arg,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware,
} from "type-graphql";
import { hash, compare } from "bcryptjs";
import { User } from "./entity/User";
import { Request, Response } from "express";
import { createAccessToken, createRefreshToken } from "./auth";
import { isAuth } from "./middlewares/isAuthMiddleware";

interface Context {
  req: Request;
  res: Response;
  payload?: { userId: string };
}

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@Resolver()
export class UserResolver {
  @Query(() => String)
  hello() {
    return "hi!";
  }

  @Query(() => String)
  @UseMiddleware(isAuth)
  bye(@Ctx() { payload }: Context) {
    return `your user id is: ${payload!.userId}`;
  }

  // query to return all users
  @Query(() => [User])
  users() {
    return User.find();
  }

  // mutation to register a new user and hash the password
  @Mutation(() => Boolean)
  async register(
    @Arg("email") email: string,
    @Arg("password") password: string
  ) {
    // hashing and salting password with bscryptjs
    const hashedPassword = await hash(password, 12);

    // inserting new user into the table
    try {
      await User.insert({
        email,
        password: hashedPassword,
      });
    } catch (e) {
      console.log(e);
      return false;
    }
    return true;
  }

  // mutation to login the user
  @Mutation(() => LoginResponse)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { res }: Context
  ) {
    // looking for the user in the database
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Could not find user");
    }

    // compare inserted password with correct one
    const valid = await compare(password, user.password);
    if (!valid) {
      throw new Error("Inccorect password");
    }

    //successfull login
    res.cookie("token", createRefreshToken(user), {
      httpOnly: true,
    });
    return {
      accessToken: createAccessToken(user),
    };
  }
}
