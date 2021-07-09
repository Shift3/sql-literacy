import { Connection } from "typeorm";

const stepFunctions:       Array<(connection: Connection) => void> = [];
const beforeEachFunctions: Array<(connection: Connection) => void> = [];

export const step = async (fun: (connection: Connection) => void) => {
  stepFunctions.push(fun);
}

export const beforeEach = async(fun: (connection: Connection) => void) => {
  beforeEachFunctions.push(fun);
}

export const runAllSteps = async (connection: Connection) => {
  for (let i = 0; i < stepFunctions.length; ++i) {
    for (let j = 0; j < beforeEachFunctions.length; ++j) {
      await beforeEachFunctions[j](connection);
    }
    
    await stepFunctions[i](connection);
    console.log();
  }
}
