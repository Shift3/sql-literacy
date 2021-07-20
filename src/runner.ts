import * as chalk from 'chalk';
import { Connection } from "typeorm";

interface NamedStepFunction {
  name: string,
  skip: boolean,

  fun:  (connection: Connection) => void,
};

interface NamedBlock {
  name:                string,
  skip:                boolean,

  stepFunctions:       NamedStepFunction[],
  beforeEachFunctions: Array<(connection: Connection) => void>,

  fun:                 () => void,
}

const globalBeforeEachFunctions: Array<(connection: Connection) => void> = [];

let currentBlock: NamedBlock;
const blocks: NamedBlock[] = [];

export const block = (name: string, fun: () => void) => {
  blocks.push({
    name,
    skip:                 false,
    stepFunctions:        [],
    beforeEachFunctions : [],
    fun
  });
}

export const xblock = (name: string, fun: () => void) => {
  blocks.push({
    name,
    skip:                 true,
    stepFunctions:        [],
    beforeEachFunctions : [],
    fun
  });
}

export const step = async (name: string, fun: (connection: Connection) => void) => {
  currentBlock.stepFunctions.push({ name, fun, skip: false } as NamedStepFunction);
}

export const xstep = async (name: string, fun: (connection: Connection) => void) => {
  currentBlock.stepFunctions.push({ name, fun, skip: true } as NamedStepFunction);
}

export const beforeEach = async(fun: (connection: Connection) => void) => {
  if (currentBlock) {
    currentBlock.beforeEachFunctions.push(fun);
  } else {
    globalBeforeEachFunctions.push(fun);
  }
}

export const runAllSteps = async (connection: Connection) => {  
  for (let b of blocks) {
    if (b.skip) {
      console.log(chalk.gray(`Skipping block '${b.name}'`));
      continue;
    }

    console.log(chalk.bold.bgBlack.white(b.name));
    console.log();
    
    // NOTE(justin): run the block function to register all the steps/beforeEaches
    currentBlock = b;
    b.fun();

    for (let nsf of b.stepFunctions) {
      if (nsf.skip) {
        console.log(chalk.gray(`Skipping step '${nsf.name}'`));
        continue;
      }

      console.time("Step took");

      for (let globalBeforeEachFun of globalBeforeEachFunctions) {
        await globalBeforeEachFun(connection);
      }

      for (let beforeEachFun of b.beforeEachFunctions) {
        await beforeEachFun(connection);
      }

      hr();
      console.log();
      h1(nsf.name);
      await nsf.fun(connection);
      console.log();
      console.timeEnd("Step took");
      console.log();
    }
  }
}

const h1 = (str: string) => {
  console.log(chalk.white.bold.bgBlue(str));
}

const hr = () => {
  console.log('----------------------------------------------------------------');
}
