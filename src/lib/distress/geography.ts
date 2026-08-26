/** Geography seed helpers — load official Census county list. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type UsStateSeed = {
  fips: string;
  code: string;
  name: string;
  country_code: string;
};

export type UsCountySeed = {
  state_fips: string;
  county_fips: string;
  fips: string;
  name: string;
  state_code: string;
  equivalent_type: string;
  classfp: string;
};

function dataDir() {
  // Works from src/lib/distress → ../../../data/distress
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, "../../../data/distress");
  } catch {
    return join(process.cwd(), "data/distress");
  }
}

function loadJson<T>(name: string): T {
  const path = join(dataDir(), name);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

let _states: UsStateSeed[] | null = null;
let _counties: UsCountySeed[] | null = null;

export function getUsStates(): UsStateSeed[] {
  if (!_states) _states = loadJson<UsStateSeed[]>("us-states.json");
  return _states;
}

export function getUsCounties(): UsCountySeed[] {
  if (!_counties) _counties = loadJson<UsCountySeed[]>("us-counties.json");
  return _counties;
}

export function countiesForState(stateCode: string): UsCountySeed[] {
  return getUsCounties().filter((c) => c.state_code === stateCode.toUpperCase());
}

export function findCounty(fips: string): UsCountySeed | undefined {
  return getUsCounties().find((c) => c.fips === fips);
}

export const TEST_MARKET_FIPS = ["47187", "47119", "47101"] as const;

export function coverageSummary() {
  const counties = getUsCounties();
  const states = getUsStates();
  const byState = new Map<string, number>();
  for (const c of counties) {
    byState.set(c.state_code, (byState.get(c.state_code) ?? 0) + 1);
  }
  return {
    totalStates: states.length,
    totalCounties: counties.length,
    byState: Object.fromEntries(byState),
  };
}
