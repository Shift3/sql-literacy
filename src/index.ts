import "reflect-metadata";
import { createConnection, Connection, QueryBuilder } from "typeorm";
import { User } from "./entity/User";
import { Profile } from "./entity/Profile";
import { format } from 'sql-formatter';
import * as chalk from 'chalk';
import { highlight } from 'sql-highlight'

createConnection().then(async connection => {
    await demo(connection);
    await connection.close();
}).catch(error => console.log(error));

const demo = async (connection: Connection) => {
    hr();
    await joinWithSelectionDemo(connection);
    hr();
    await joinWithoutSelectionDemo(connection);
    hr();
    await cascadeDeletionDemo(connection);
    hr();

    await resetDatabase(connection);
}

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

        const userWithProfiles = userRepository.create({
            firstName: "With",
            lastName:  "Profiles",
            age:       25,
        });

        const profile1 = new Profile();
        profile1.name = "Profile 1";
        profile1.user = userWithProfiles;

        const profile2 = new Profile();
        profile2.name = "Profile 2";
        profile2.user = userWithProfiles;

        await manager.save(userWithoutProfiles);
        await manager.save(userWithProfiles);
        await manager.save(profile1);
        await manager.save(profile2);
    });
}

const joinWithSelectionDemo = async (connection: Connection) => {
    await resetDatabase(connection);

    h1('Question: Get me all users and their profiles.');
    const allUsersAndProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .leftJoinAndSelect('user.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(allUsersAndProfiles);
    hr();

    h1('Question: Get me only the users who have profiles.');
    const usersOnlyWithProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoinAndSelect('user.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(usersOnlyWithProfiles);
}

const joinWithoutSelectionDemo = async (connection: Connection) => {
    await resetDatabase(connection);

    h1("Question: Find me only users that have profiles");
    const usersWithProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .innerJoin('user.profiles', 'profileAlias')
        .logSql()
        .getMany();
    console.log(usersWithProfiles);
    hr();

    h1("Question: Find me only users that don't have any profiles");
    const usersWithoutProfiles = await connection
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .leftJoin('user.profiles', 'profileAlias')
        .where('profileAlias.id IS NULL')
        .logSql()
        .getMany();
    console.log(usersWithoutProfiles);
}

const cascadeDeletionDemo = async (connection: Connection) => {
    await resetDatabase(connection);

    h1("Question: I want to delete a user AND it's profiles");
    await connection
        .createQueryBuilder()
        .delete()
        .from(User)
        .where('firstName = :firstName', {firstName: 'With'})
        .logSql()
        .execute();

    await printDatabaseState(connection);
}

const printDatabaseState = async (connection: Connection) => {
    console.log(chalk.black.bgYellowBright("Database State"));
    const users = await connection.getRepository(User).find();
    console.log(chalk.yellowBright("Users\n"), users);
    const profiles = await connection.getRepository(Profile).find();
    console.log();
    console.log(chalk.yellowBright("Profiles\n"), profiles);
}

const hr = () => {
    console.log("----------------------------------------");
}

const h1 = (str: string) => {
    console.log(chalk.black.bgBlue(str));
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
