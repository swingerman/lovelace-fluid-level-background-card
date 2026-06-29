// Decorative randomness for bubble jitter and animation start offsets. Uses the Web Crypto
// PRNG rather than Math.random() — the values aren't security-sensitive, but this keeps static
// analysis from flagging an "insecure" generator (Sonar S2245) for what is purely cosmetic.
export const rand = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
