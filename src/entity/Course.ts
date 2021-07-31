import { Entity, PrimaryGeneratedColumn, ManyToMany, Column } from "typeorm";
import { User } from "./User";

@Entity()
export class Course {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, user => user.courses)
  users: User[];
}
