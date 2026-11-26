// Test data scenarios for `npm run seed` (TechSpec 4.3, 6). Each scenario fills an empty project folder with
// synthetic data. Scenarios `default`, `unreadable` and `two-hundred` follow with their tasks.

export type SeedScenario = (projectFolder: string) => Promise<void>;

export const SEED_SCENARIOS: Readonly<Record<string, SeedScenario>> = {
  /** An empty project folder: no Ramifold area, no plans (UI-001.empty). */
  empty: async () => {},
};
