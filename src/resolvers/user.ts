import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, Mutation, ObjectType, Resolver, Query } from "type-graphql";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from 'uuid';


@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver()
export class UserResolver {
    @Mutation(() => UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() { redis, em, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 3) {
            return { 
                errors: [
                    {
                        field: "newPassword",
                        message: "password length must be greater than 3"
                    },
                ],
            };
        }
        const key = FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) {
            return { 
                errors: [
                    {
                        field: "token",
                        message: "token expired"
                    },
                ],
            };
        }

        const user = await em.findOne(User, {id: parseInt(userId)});

        if (!user) {
            return { 
                errors: [
                    {
                        field: "token",
                        message: "user no longer exists"
                    },
                ],
            };
        }

        user.password = await argon2.hash(newPassword);
        await em.persistAndFlush(user);

        // log in the user after password change
        await redis.del(key);
        req.session.userId = user.id;

        return { user };
    }



    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { em, redis } : MyContext) {
        const user = await em.findOne(User, { email });
        if (!user) {
            // email is not in db => do nothing
            return true;
        }
        const token = v4(); // generates a random string unique token

        await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 3);

        await sendEmail(email, `<a href="http://localhost:3000/change-password/${token}">reset password</a>`);
        return true;
    }

    @Query(() => User, { nullable: true })
    async me(
        @Ctx() { req, em }: MyContext
    ) {
        console.log(req.session);
        if (!req.session?.id) { // you are not logged in
            return null;
        }
        const user = await em.findOne(User, {id: req.session.userId}); // consider logged in if they have a cookie
        return user;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("options") options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors){
            return {errors};
        }
        
        const hashedPassword = await argon2.hash(options.password);
        let user;
        try {
            const result = await (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
                username: options.username,
                email: options.email,
                password: hashedPassword,
                created_at: new Date(),
                updated_at: new Date(),
            }).returning("*"); // all the fields from user
        user = result[0];
        } catch(err) {
            if (err.code === '23505') { // || err.detail.includes("already exists")) {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username already taken",
                        },
                    ],
                };
            }
        }
        req.session.userId = user.id; // you no longer can store anything inside  session variable: for example, user id - but not with the latest express-session

        
        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, usernameOrEmail.includes('@') ? 
            { email: usernameOrEmail }
            : {username: usernameOrEmail}
            );
        if (!user) {
            return {
                errors: [{
                    field: "usernameOrEmail",
                    message: "that username doesn't exist",
                },
                ],
            };
        }
        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [{
                    field: "password",
                    message: "incorrect",
                },
                ],
            };
        }

        req.session.userId = user.id ; // you no longer can store anything inside  session variable: for example, user id - but not with the latest express-session
        
        return {
            user,
        };
    }

    @Mutation( () => Boolean )
    logout(
        @Ctx() { req, res }: MyContext
    ) {
        return new Promise((resolve) => req.session.destroy(err => { // will wait for resolved and callback to finish / will clear the redis
            res.clearCookie(COOKIE_NAME); // put it here if we want to clear the cookie whether it successfully destroys the session or not
            if (err) {
                console.log(err);
                resolve(false);
                return;
            }
            // res.clearCookie(COOKIE_NAME); 
            resolve(true);
        }));
    }
}