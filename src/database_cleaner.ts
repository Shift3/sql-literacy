import { Connection } from "typeorm";

export interface IDatabaseCleanerStrategy {
    do: (connection: Connection) => void,
}

export class FastTruncateStrategy implements IDatabaseCleanerStrategy {
    async do (connection: Connection) {
        let entities = await connection.entityMetadatas;

        try {
            await connection.query(
                entities.map(e => `ALTER TABLE "${e.tableName}" DISABLE TRIGGER ALL;`).join(" ")
            );
            
            await connection.manager.query(
                "TRUNCATE " + entities.map(e => `"${e.tableName}"`).join(", ")
            );
        } finally {
            await connection.query(
                entities.map(e => `ALTER TABLE "${e.tableName}" ENABLE TRIGGER ALL;`).join(" ")
            );
        }
    }
}

export class FullSychronizeStrategy implements IDatabaseCleanerStrategy {
  async do (connection: Connection) {
    const dropBeforeSync = true;
    await connection.synchronize(dropBeforeSync);
  }
}

export class DatabaseCleaner {
    private static strategy: IDatabaseCleanerStrategy = new FastTruncateStrategy();
    
    static useStrategy(strategy: IDatabaseCleanerStrategy) {
        this.strategy = strategy;
    }
    
    static async clean(connection: Connection) {
        await this.strategy.do(connection);
    }
}
