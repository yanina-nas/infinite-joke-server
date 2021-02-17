import { MikroORM } from "@mikro-orm/core";
import { COOKIE_NAME, __prod__ } from "./constants";
import "reflect-metadata";
// import { Post } from "./entities/Post";
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { HelloResolver } from "./resolvers/hello";
import { buildSchema } from "type-graphql";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import cors from 'cors';
// import { sendEmail } from "./utils/sendEmail";


const main = async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up(); // runs migrations before it does anything else, it's not rerunning old migrations. keeps track of migrations that were run. in db mikro-orm-migrations

    const app = express();

    const RedisStore = connectRedis(session);
    const redis = new Redis();
    app.use(cors({
        origin: "http://localhost:3000", // middleware will bw applied to all the routes
        credentials: true,
    }))

    app.use( // the order that you run express middleware matters
        session({
            name: COOKIE_NAME, // cookie id
            store: new RedisStore({ 
                client: redis,
                disableTouch: true,
             }), // tells express session that we are using redis
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 yrs
                httpOnly: true, // security reasons - in your frontend you cannot access the cookie
                sameSite: 'lax', // csrf - google it.
                secure: __prod__, // cookie only works in https
            },
            saveUninitialized: false,
            secret: '3641284528ygufg-random string-jchbhjcbewjc9749276143',
            resave: false,
        })
    )


    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({ em: orm.em, req, res, redis })
    });

    apolloServer.applyMiddleware({ app, cors: false }); // if not set, defaults to a star => error

    app.listen(4000, () => {
        console.log('server started on localhost: 4000')
    });
};

main().catch((err) => {
    console.error(err);
});
