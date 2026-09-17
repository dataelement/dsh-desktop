import { describe, expect, it } from "vitest";
import { MemoryAcpCookieStore } from "./cookie-store.js";
describe("MemoryAcpCookieStore", () => {
    it("stores single and multiple Set-Cookie values", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["transport=alpha; Path=/"]));
        store.store(headersWithSetCookie(["route=bravo; Path=/", "affinity=charlie"]));
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("transport=alpha; route=bravo; affinity=charlie");
    });
    it("splits combined Set-Cookie headers with Expires commas", () => {
        const store = new MemoryAcpCookieStore();
        store.store(new Headers({
            "Set-Cookie": "transport=alpha; Expires=Wed, 21 Oct 2030 07:28:00 GMT, route=bravo; Path=/",
        }));
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("transport=alpha; route=bravo");
    });
    it("ignores malformed cookie headers", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie([
            "missing-separator",
            "=empty-name",
            " =blank",
            "ok=value",
        ]));
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("ok=value");
    });
    it("lets later cookies overwrite earlier cookies with the same name", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["route=alpha", "route=bravo"]));
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("route=bravo");
    });
    it("writes a Cookie header when managed cookies exist", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["transport=alpha"]));
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("transport=alpha");
    });
    it("merges managed cookies with caller-provided Cookie headers", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["transport=alpha", "route=bravo"]));
        const headers = new Headers({ Cookie: "caller=custom" });
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("transport=alpha; route=bravo; caller=custom");
    });
    it("lets caller-provided cookie values override managed duplicate names", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["transport=alpha", "route=bravo"]));
        const headers = new Headers({ Cookie: "route=caller; caller=custom" });
        store.apply(headers);
        expect(headers.get("Cookie")).toBe("transport=alpha; route=caller; caller=custom");
    });
    it("clears managed cookies", () => {
        const store = new MemoryAcpCookieStore();
        store.store(headersWithSetCookie(["transport=alpha"]));
        store.clear();
        const headers = new Headers();
        store.apply(headers);
        expect(headers.get("Cookie")).toBeNull();
    });
});
function headersWithSetCookie(values) {
    const headers = new Headers();
    Object.defineProperty(headers, "getSetCookie", {
        value: () => values,
    });
    return headers;
}
//# sourceMappingURL=cookie-store.test.js.map