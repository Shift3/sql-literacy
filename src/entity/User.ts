import { Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import { Profile } from "./Profile";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

    @OneToMany(() => Profile, profile => profile.user)
    profiles: Profile[];

}
