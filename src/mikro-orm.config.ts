import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from 'path';
import { User } from "./entities/User";


export default {
    migrations: {
        path: path.join(__dirname, './migrations'), // path to the folder with migrations
        pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    },
    entities: [Post, User],
    dbName: 'postgres',
    type: 'postgresql',
    user: 'postgres',
    password: 'example',
    debug: !__prod__,
    port: 27017,
} as Parameters<typeof MikroORM.init>[0];