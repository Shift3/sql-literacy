import "reflect-metadata";
import { createConnection, Connection } from "typeorm";
import { User } from "./entity/User";
import { Purchase } from "./entity/Purchase";
import * as chalk from 'chalk';
import { xblock, block, xstep, step, beforeEach, runAllSteps } from "./runner";
import { DatabaseCleaner, FullSychronizeStrategy, FastTruncateStrategy } from "./database_cleaner";

import "./extend-query-builder";
import { Store } from "./entity/Store";

beforeEach(async (connection: Connection) => {
  await DatabaseCleaner.clean(connection);
});

xblock('The Basics', () => {
  step('Add a new user', async (connection: Connection) => {
    await connection
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        firstName: 'Ham',
        lastName:  'Burger',
        age:       2
      })
      .logSql()
      .execute();
    await printDatabaseState(connection);
  });

  step('Update a user', async (connection: Connection) => {
    await seedDatabase(connection);
    await connection
      .createQueryBuilder()
      .update(User)
      .set({
        lastName: "New Last Name",
        age:      500,
      })
      .where("firstName = :firstName", { firstName: 'With' })
      .logSql()
      .execute();
    await printDatabaseState(connection);
  });

  step("Delete a user AND it's purchases", async (connection: Connection) => {
    await seedDatabase(connection);
    await printDatabaseState(connection);
    await connection
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('firstName = :firstName', {firstName: 'With'})
      .logSql()
      .execute();
    await printDatabaseState(connection);

    // NOTE(justin): See User.ts and the associated delete cascade.
  });
});

xblock('Joins', () => {
  beforeEach(async (connection: Connection) => {
    await seedDatabase(connection);
  });

  step('Get me all users and their purchases', async (connection: Connection) => {
    const allUsersAndPurchases = await connection
      .createQueryBuilder()
      .select('userAlias')
      .from(User, 'userAlias')
      .leftJoinAndSelect('userAlias.purchases', 'purchaseAlias')
      .logSql()
      .getMany();
    console.log(allUsersAndPurchases);
  });

  step('Get me only the users who have purchases', async (connection: Connection) => {
    const usersOnlyWithPurchases = await connection
      .createQueryBuilder()
      .select('user')
      .from(User, 'user')
      .innerJoinAndSelect('user.purchases', 'purchaseAlias')
      .logSql()
      .getMany();
    console.log(usersOnlyWithPurchases);
  });

  step('Find me only users that have purchases', async (connection: Connection) => {
    const usersWithPurchases = await connection
      .createQueryBuilder()
      .select('user')
      .from(User, 'user')
      .innerJoin('user.purchases', 'purchaseAlias')
      .logSql()
      .getMany();
    console.log(usersWithPurchases);
  });

  step("Find me only users that don't have any purchases", async (connection: Connection) => {
    const usersWithoutPurchases = await connection
      .createQueryBuilder()
      .select('user')
      .from(User, 'user')
      .leftJoin('user.purchases', 'purchaseAlias')
      .where('purchaseAlias.id IS NULL')
      .logSql()
      .getMany();
    console.log(usersWithoutPurchases);
  });
});

xblock('Agregations', () => {
  beforeEach(async (connection: Connection) => {
    await seedDatabase(connection);
  });

  step("I want to count how many purchases each user has", async (connection: Connection) => {
    let result = await connection
      .createQueryBuilder()
      .select('user')
      .from(User, 'user')
      .leftJoin('user.purchases', 'purchaseAlias')
      .groupBy('user.id')
      .addSelect('COUNT(purchaseAlias.id)::int AS purchase_count')
      .logSql()
      .getRawMany();
    console.log(result);
  });

  step("How much has each user purchased?", async (connection: Connection) => {
    let result = await connection
      .createQueryBuilder()
      .select('user.id', 'id')
      .from(User, 'user')
      .leftJoin('user.purchases', 'purchaseAlias')
      .groupBy('user.id')
      .addSelect('COALESCE(SUM(purchaseAlias.amount), 0)::decimal(10,2) AS total')
      .logSql()
      .getRawMany();
    console.log(result);
  });
});

block('Bonus: Geolocation', () => {

  beforeEach(async (connection: Connection) => {
    await connection
      .createQueryBuilder()
      .insert()
      .into(Store)
      .values([
        {
          name: "Denny's",
          location: () => {
            return `ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [-119.6941732, 36.8379970]}'), 4326) :: geometry`;
          }
        },
        {
          name: "Bobby Salazar's Taqueria",
          location: () => {
            return `ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [-119.6836340, 36.8391925]}'), 4326) :: geometry`;
          }
        },
        {
          name: "Dickey's",
          location: () => {
            return `ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [-119.6863092, 36.8370508]}'), 4326) :: geometry`;
          }
        },
        {
          name: "Tokyo Steakhouse",
          location: () => {
            return `ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [-119.6813979, 36.8390289]}'), 4326) :: geometry`;
          }
        },
        {
          name: "House of Juju",
          location: () => {
            return `ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [-119.7018081, 36.8235597]}'), 4326) :: geometry`;
          }
        },
      ])
      .execute();
  });

  step("Find stores in a radius around me", async (connection: Connection) => {
    const myLocation = {
      type: "Point",
      coordinates: [
        "-119.7024",
        "36.8406",
      ]
    };

    let storesInRadius = await connection
      .createQueryBuilder()
      .select('store')
      .from(Store, 'store')
      .addSelect(`
        ST_Distance(
          ST_Transform(store.location, 900913),
          ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:location), 4326), 900913)
        ) as distance_in_meters`)
      .where(`
        ST_DWithin(
          ST_Transform(store.location, 900913),
          ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:location), 4326), 900913),
          :meters
        )`, { meters: 2000 })
      .setParameters({
        location: JSON.stringify(myLocation)
      })
      .orderBy('distance_in_meters', 'ASC')
      .logSql()
      .getRawMany();
    console.log(storesInRadius);
  });
});

const seedDatabase = async (connection: Connection) => {
  await connection.transaction(async manager => {
    const userRepository = connection.getRepository(User);

    const userWithoutPurchases = userRepository.create({
      firstName: "Without",
      lastName:  "Purchases",
      age:       99,
    });
    await manager.save(userWithoutPurchases);

    const userWithPurchases = userRepository.create({
      firstName: "With",
      lastName:  "Purchases",
      age:       25,
    });
    await manager.save(userWithPurchases);

    const purchase1  = new Purchase();
    purchase1.name   = "Purchase 1";
    purchase1.amount = 12.50;
    purchase1.user   = userWithPurchases;
    await manager.save(purchase1);

    const purchase2  = new Purchase();
    purchase2.name   = "Purchase 2";
    purchase2.amount = 3.99;
    purchase2.user   = userWithPurchases;
    await manager.save(purchase2);

  });
};

const printDatabaseState = async (connection: Connection) => {
  console.log(chalk.black.bgYellowBright("Database State"));
  const users = await connection.getRepository(User).find();
  console.log(chalk.redBright("Users\n"), users);
  const purchases = await connection.getRepository(Purchase).find();
  console.log();
  console.log(chalk.redBright("Purchases\n"), purchases);
}

createConnection().then(async connection => {
  DatabaseCleaner.useStrategy(FullSychronizeStrategy);
  await DatabaseCleaner.clean(connection);
  DatabaseCleaner.useStrategy(FastTruncateStrategy);
  await runAllSteps(connection);
  await connection.close();
}).catch(error => console.log(error));
