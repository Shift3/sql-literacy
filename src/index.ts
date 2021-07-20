import "reflect-metadata";
import { createConnection, Connection, QueryBuilder } from "typeorm";
import { User } from "./entity/User";
import { Profile } from "./entity/Profile";
import { format } from 'sql-formatter';
import * as chalk from 'chalk';
import { highlight } from 'sql-highlight'
import { step, beforeEach, runAllSteps } from "./runner";

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

        const userWithoutProfiles = userRepository.create({
            firstName: "Without",
            lastName:  "Profiles",
            age:       99,
        });
        await manager.save(userWithoutProfiles);

        const profile1 = new Profile();
        profile1.name = "Profile 1";
        await manager.save(profile1);
        
        const profile2 = new Profile();
        profile2.name = "Profile 2";
        await manager.save(profile2);

        const userWithProfiles = userRepository.create({
            firstName: "With",
            lastName:  "Profiles",
            age:       25,
            profiles:  [profile1, profile2]
        });
        await manager.save(userWithProfiles);
    });
};

beforeEach(async (connection: Connection) => {
    await resetDatabase(connection);
});

step('Get me all users and their profiles.', async (connection: Connection) => {
    const allUsersAndProfiles = await connection
        .createQueryBuilder()
        .select('userAlias')
        .from(User, 'userAlias')
        .leftJoinAndSelect('userAlias.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(allUsersAndProfiles);
});

step('Get me only the users who have profiles.', async (connection: Connection) => {
    const usersOnlyWithProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoinAndSelect('user.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(usersOnlyWithProfiles);
});

step('Find me only users that have profiles', async (connection: Connection) => {
    const usersWithProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoin('user.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(usersWithProfiles);
});

step("Find me only users that don't have any profiles", async (connection: Connection) => {
    const usersWithoutProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .leftJoin('user.profiles', 'profileAlias')
        .where('profileAlias.id IS NULL')
        .logSql()
        .getMany();
    console.log(usersWithoutProfiles);
});

step("I want to delete a user AND it's profiles", async (connection: Connection) => {
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

step("I want to count how many profiles each user has", async (connection: Connection) => {
    let result = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .leftJoin('user.profiles', 'profileAlias')
        .addSelect('COUNT(profileAlias.id)::int AS profile_count')
        .groupBy('user.id')
        .logSql()
        .getRawMany();
    console.log(result);
});

const printDatabaseState = async (connection: Connection) => {
    console.log(chalk.black.bgYellowBright("Database State"));
    const users = await connection.getRepository(User).find();
    console.log(chalk.redBright("Users\n"), users);
    const profiles = await connection.getRepository(Profile).find();
    console.log();
    console.log(chalk.redBright("Profiles\n"), profiles);
}

// NOTE(justin): extend query builder with better logging
declare module 'typeorm/query-builder/QueryBuilder' {
    interface QueryBuilder<Entity> {
        logSql(): this;
    }
}

QueryBuilder.prototype.logSql = function<Entity>(this: QueryBuilder<Entity>) {
    let [query, params] = this.getQueryAndParameters();

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
