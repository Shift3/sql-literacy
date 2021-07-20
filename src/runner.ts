import * as chalk from 'chalk';
import { Connection } from "typeorm";

interface NamedStepFunction {
  name: string,
  fun:  (connection: Connection) => void,
  skip: boolean,
};

const h1 = (str: string) => {
  console.log(chalk.white.bold.bgBlue(str));
}

const hr = () => {
  console.log('----------------------------------------------------------------');
}

const stepFunctions:       Array<NamedStepFunction>                = [];
const beforeEachFunctions: Array<(connection: Connection) => void> = [];

export const step = async (name: string, fun: (connection: Connection) => void) => {
  stepFunctions.push({ name, fun, skip: false } as NamedStepFunction);
}

export const xstep = async (name: string, fun: (connection: Connection) => void) => {
  stepFunctions.push({ name, fun, skip: true } as NamedStepFunction);
}

export const beforeEach = async(fun: (connection: Connection) => void) => {
  beforeEachFunctions.push(fun);
}

export const runAllSteps = async (connection: Connection) => {
  for (let i = 0; i < stepFunctions.length; ++i) {

    const nsf = stepFunctions[i];
    if (nsf.skip) {
      console.log(chalk.gray(`Skipping '${nsf.name}'`));
    } else {
      for (let j = 0; j < beforeEachFunctions.length; ++j) {
        await beforeEachFunctions[j](connection);
      }

      hr();
      console.log();
      h1(nsf.name);
      await nsf.fun(connection);
      console.log();
    }
  }
}
