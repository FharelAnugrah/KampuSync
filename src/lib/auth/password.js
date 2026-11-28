import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
/**
 * Hashes a plain-text password using scrypt with a random 16-byte salt.
 */
export function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS).toString("hex");
    return `scrypt$${salt}$${derived}`;
}
/**
 * Verifies a plain-text password against a stored scrypt hash using constant-time comparison.
 */
export function verifyPassword(password, storedHash) {
    const parts = storedHash.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
    }
    const [, salt, hashHex] = parts;
    if (!salt || !hashHex)
        return false;
    try {
        const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
        const expected = Buffer.from(hashHex, "hex");
        if (derived.length !== expected.length)
            return false;
        return timingSafeEqual(derived, expected);
    }
    catch {
        return false;
    }
}
