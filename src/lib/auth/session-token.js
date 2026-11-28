export const SESSION_COOKIE_NAME = "kampusync_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (secret && secret.length >= 16)
        return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET must be set to at least 16 characters in production.");
    }
    return "kampusync-dev-fallback-secret-key-do-not-use-in-prod";
}
function toBase64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(input) {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
async function getHmacKey(usage) {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, usage);
}
/**
 * Signs a session payload into a compact HMAC-SHA256 token compatible with Edge & Node runtimes.
 */
export async function signSessionToken(payload, ttlSeconds = SESSION_TTL_SECONDS) {
    const fullPayload = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(fullPayload)));
    const key = await getHmacKey(["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    const signature = toBase64Url(new Uint8Array(signatureBuffer));
    return `${encoded}.${signature}`;
}
/**
 * Verifies an HMAC-SHA256 session token and returns the decoded payload if valid and unexpired.
 */
export async function verifySessionToken(token) {
    if (!token)
        return null;
    const parts = token.split(".");
    if (parts.length !== 2)
        return null;
    const [encoded, signature] = parts;
    if (!encoded || !signature)
        return null;
    try {
        const key = await getHmacKey(["verify"]);
        const sigBytes = fromBase64Url(signature);
        const valid = await crypto.subtle.verify("HMAC", key, sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength), new TextEncoder().encode(encoded));
        if (!valid)
            return null;
        const json = new TextDecoder().decode(fromBase64Url(encoded));
        const parsed = JSON.parse(json);
        if (!parsed.userId || !parsed.role || typeof parsed.exp !== "number")
            return null;
        if (parsed.exp < Math.floor(Date.now() / 1000))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
