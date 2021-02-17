import { Migration } from '@mikro-orm/migrations';

export class Migration20210214231724 extends Migration { // looks at postgresql database and compares it against the entities we have, making sure they matck exactly. if not, it creates a sql

  async up(): Promise<void> {
    this.addSql('create table "user" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "username" text not null, "password" text not null);');
    this.addSql('alter table "user" add constraint "user_username_unique" unique ("username");');
  }

}
