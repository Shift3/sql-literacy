import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from "typeorm";

@Entity()
export class Store {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: false,
  })
  @Index({ spatial: true })
  location: string;
}
