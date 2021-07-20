import "reflect-metadata";
import { createConnection, Connection, QueryBuilder } from "typeorm";
import { User } from "./entity/User";
import { Purchase } from "./entity/Purchase";
import { format } from 'sql-formatter';
import * as chalk from 'chalk';
import { highlight } from 'sql-highlight'
import { xstep, step, beforeEach, runAllSteps } from "./runner";

createConnection().then(async connection => {
    await runAllSteps(connection);
    await resetDatabase(connection);
    await connection.close();
}).catch(error => console.log(error));

const resetDatabase = async (connection: Connection) => {
    const dropBeforeSync = true;
    await connection.synchronize(dropBeforeSync);

    await connection.transaction(async manager => {
        const userRepository = connection.getRepository(User);

        const userWithoutPurchases = userRepository.create({
            firstName: "Without",
            lastName:  "Purchases",
            age:       99,
        });
        await manager.save(userWithoutPurchases);

        const purchase1  = new Purchase();
        purchase1.name   = "Purchase 1";
        purchase1.amount = 12.50;
        await manager.save(purchase1);
        
        const purchase2  = new Purchase();
        purchase2.name   = "Purchase 2";
        purchase2.amount = 3.99;
        await manager.save(purchase2);

        const userWithPurchases = userRepository.create({
            firstName: "With",
            lastName:  "Purchases",
            age:       25,
            purchases:  [purchase1, purchase2]
        });
        await manager.save(userWithPurchases);
    });
};

beforeEach(async (connection: Connection) => {
    await resetDatabase(connection);
});

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

xstep('Get me all users and their purchases', async (connection: Connection) => {
    const allUsersAndPurchases = await connection
        .createQueryBuilder()
        .select('userAlias')
        .from(User, 'userAlias')
        .leftJoinAndSelect('userAlias.purchases', 'purchaseAlias')
        .logSql()
        .getMany();
    console.log(allUsersAndPurchases);
});

xstep('Get me only the users who have purchases', async (connection: Connection) => {
    const usersOnlyWithPurchases = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoinAndSelect('user.purchases', 'purchaseAlias')
        .logSql()
        .getMany();
    console.log(usersOnlyWithPurchases);
});

xstep('Find me only users that have purchases', async (connection: Connection) => {
    const usersWithPurchases = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoin('user.purchases', 'purchaseAlias')
        .logSql()
        .getMany();
    console.log(usersWithPurchases);
});

xstep("Find me only users that don't have any purchases", async (connection: Connection) => {
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

xstep("I want to delete a user AND it's purchases", async (connection: Connection) => {
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

xstep("I want to count how many purchases each user has", async (connection: Connection) => {
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

xstep("How much has each user purchased?", async (connection: Connection) => {
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

const printDatabaseState = async (connection: Connection) => {
    console.log(chalk.black.bgYellowBright("Database State"));
    const users = await connection.getRepository(User).find();
    console.log(chalk.redBright("Users\n"), users);
    const purchases = await connection.getRepository(Purchase).find();
    console.log();
    console.log(chalk.redBright("Purchases\n"), purchases);
}

// NOTE(justin): extend query builder with better logging
declare module 'typeorm/query-builder/QueryBuilder' {
    interface QueryBuilder<Entity> {
        logSql(): this;
    }
}

QueryBuilder.prototype.logSql = function<Entity>(this: QueryBuilder<Entity>) {
    let [query, params] = this.getQueryAndParameters();

    // HACK(justin): getQueryAndParameters also mutates
    // state.... makes inserts fail on execute, unmutate the state
    this.expressionMap.nativeParameters = {};
    
    // NOTE(justin): typeorm params are 1 indexed
    params.unshift(null);

    // NOTE(justin): Make sql-formatter compliant query string and param list.
    query  = query.replace(/\$/g, ':')
    params = params.map(param => typeof param == 'string' ? `'${param}'` : param);

    console.log()
    console.log(highlight(format(query, {
        params,
        uppercase: true,
        language: 'postgresql'
    })));
    console.log();

    return this;
};
