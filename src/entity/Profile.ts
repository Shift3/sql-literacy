import { Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import { User } from "./User";

@Entity()
export class Profile {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: false})
  name: string;

  @ManyToOne(() => User, user => user.profiles, { onDelete: 'CASCADE' })
  user: User;

}
