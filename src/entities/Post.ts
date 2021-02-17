import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";

@ObjectType() // stacking decorators
@Entity() // tells mikro-orm: this is an entity = corresponds to a table
export class Post {
  @Field()
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({type: 'date'})
  createdAt = new Date();

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() }) 
  updatedAt = new Date();

  @Field() // if i comment out this field it would be no longer exposed/availible to graphql schema
  @Property({type: 'text'}) // decorates: tells that this is a column
  title!: string;
}