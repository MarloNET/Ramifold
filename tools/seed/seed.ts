import fsp from "node:fs/promises";
import path from "node:path";
import { SEED_SCENARIOS } from "./seed-scenarios";

// `npm run seed -- <folder> [--scenario <name>]`: creates a project folder with synthetic test data.

const DEFAULT_SCENARIO = "default";

async function main(argv: string[]): Promise<number> {
  const scenarioIndex = argv.indexOf("--scenario");
  const scenarioName = scenarioIndex === -1 ? DEFAULT_SCENARIO : argv[scenarioIndex + 1];
  const folderArg = argv.find((arg, i) => !arg.startsWith("--") && i !== scenarioIndex + 1);
  const scenario = scenarioName === undefined ? undefined : SEED_SCENARIOS[scenarioName];
  if (folderArg === undefined || scenario === undefined) {
    console.error(`Usage: npm run seed -- <folder> --scenario <${Object.keys(SEED_SCENARIOS).join("|")}>`);
    return 1;
  }
  const folder = path.resolve(folderArg);
  await fsp.mkdir(folder, { recursive: true });
  if ((await fsp.readdir(folder)).length > 0) {
    console.error(`seed: ${folder} is not empty`);
    return 1;
  }
  await scenario(folder);
  console.log(`seed: scenario "${scenarioName}" created in ${folder}`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
