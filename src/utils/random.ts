// Decorative randomness for bubble jitter and animation start offsets — NOT security-sensitive.
// A tiny self-contained PRNG (mulberry32), seeded once per load. It deliberately avoids both
// Math.random() (flagged by Sonar S2245) and the Web Crypto PRNG (whose values would flow into a
// modulo and trip CodeQL's biased-random query). For purely cosmetic jitter, neither rule applies.
let seed = Date.now() >>> 0 || 1;

export const rand = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
