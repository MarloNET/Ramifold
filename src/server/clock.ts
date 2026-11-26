/** Time source of the server; tests replace it. */
export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };
