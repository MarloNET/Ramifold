import { randomBytes } from "node:crypto";

// Monotonic ULIDs (TechSpec 2.0): 48-bit millisecond timestamp and 80 random bits, Crockford base32.

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RANDOM_CHARS = 16;

let lastTime = -1;
let lastRandom: number[] = [];

export function newId(now: number = Date.now()): string {
  if (now <= lastTime) {
    // Same (or earlier) millisecond: increment the previous random part so that ids keep increasing.
    incrementBase32(lastRandom);
  } else {
    lastTime = now;
    lastRandom = Array.from(randomBytes(RANDOM_CHARS), (byte) => byte % 32);
  }
  return encodeTime(lastTime) + lastRandom.map((digit) => ALPHABET[digit]).join("");
}

function encodeTime(time: number): string {
  let out = "";
  let rest = time;
  for (let i = 0; i < 10; i += 1) {
    out = ALPHABET[rest % 32] + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

function incrementBase32(digits: number[]): void {
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    if (digits[i]! < 31) {
      digits[i] = digits[i]! + 1;
      return;
    }
    digits[i] = 0;
  }
  throw new Error("ULID random part overflow");
}
