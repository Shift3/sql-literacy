import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable} from "typeorm";
import { Purchase } from "./Purchase";
import { Course } from "./Course";

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

    @OneToMany(() => Purchase, purchase => purchase.user)
    purchases: Purchase[];

    @ManyToMany(() => Course, course => course.users)
    @JoinTable()
    courses: Course[];
}
