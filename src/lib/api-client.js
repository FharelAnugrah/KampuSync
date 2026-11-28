export async function apiFetch(url, options) {
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
    });
    const json = await res.json().catch(() => ({ ok: false, error: "Respon server tidak valid." }));
    if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Permintaan gagal (${res.status}).`);
    }
    return json.data;
}
