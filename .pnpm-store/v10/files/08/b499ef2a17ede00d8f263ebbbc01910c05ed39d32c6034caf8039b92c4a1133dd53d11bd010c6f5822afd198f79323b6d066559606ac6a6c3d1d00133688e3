/** In-memory implementation of {@link AcpCookieStore}. */
export class MemoryAcpCookieStore {
    cookies = new Map();
    store(headers) {
        for (const value of setCookieHeaders(headers)) {
            const cookie = parseSetCookie(value);
            if (!cookie) {
                continue;
            }
            this.cookies.set(cookie.name, cookie.value);
        }
    }
    apply(headers) {
        const merged = mergeCookieHeaders(this.cookieHeader(), headers.get("Cookie"));
        if (merged) {
            headers.set("Cookie", merged);
        }
    }
    clear() {
        this.cookies.clear();
    }
    cookieHeader() {
        return this.cookies.size === 0
            ? undefined
            : Array.from(this.cookies)
                .map(([name, value]) => `${name}=${value}`)
                .join("; ");
    }
}
function setCookieHeaders(headers) {
    const getSetCookie = headers.getSetCookie;
    if (typeof getSetCookie === "function") {
        return getSetCookie.call(headers).flatMap(splitSetCookieHeader);
    }
    const setCookie = headers.get("Set-Cookie");
    return setCookie ? splitSetCookieHeader(setCookie) : [];
}
function splitSetCookieHeader(header) {
    return header
        .split(/,(?=\s*[^;,\s]+=)/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}
function parseSetCookie(header) {
    const pair = header.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator <= 0) {
        return undefined;
    }
    const name = pair.slice(0, separator).trim();
    if (!name) {
        return undefined;
    }
    return {
        name,
        value: pair.slice(separator + 1).trim(),
    };
}
function mergeCookieHeaders(managedCookieHeader, callerCookieHeader) {
    const cookies = new Map();
    for (const cookie of parseCookieHeader(managedCookieHeader)) {
        cookies.set(cookie.name, cookie.value);
    }
    for (const cookie of parseCookieHeader(callerCookieHeader ?? undefined)) {
        cookies.set(cookie.name, cookie.value);
    }
    return cookies.size === 0
        ? undefined
        : Array.from(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
}
function parseCookieHeader(header) {
    if (!header) {
        return [];
    }
    return header
        .split(";")
        .map(parseCookiePair)
        .filter((cookie) => cookie !== undefined);
}
function parseCookiePair(value) {
    const separator = value.indexOf("=");
    if (separator <= 0) {
        return undefined;
    }
    const name = value.slice(0, separator).trim();
    if (!name) {
        return undefined;
    }
    return {
        name,
        value: value.slice(separator + 1).trim(),
    };
}
//# sourceMappingURL=cookie-store.js.map