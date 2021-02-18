import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { Field, ObjectType } from "type-graphql";

@ObjectType() // stacking decorators
@Entity() // tells to orm: this is an entity = corresponds to a table
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn() 
  updatedAt: Date;

  @Field()
  @Column()
  title!: string;
}