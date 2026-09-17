import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { excludeKnownTags, preserveCustomPayload, } from "./schema-deserialize.js";
describe("excludeKnownTags", () => {
    const catchAll = excludeKnownTags(z.object({ mode: z.string() }), "mode", [
        "form",
        "url",
    ]);
    it("accepts values with a custom tag", () => {
        expect(catchAll.safeParse({ mode: "_vendor" }).success).toBe(true);
    });
    it("rejects values whose tag is reserved by a known variant", () => {
        const result = catchAll.safeParse({ mode: "form" });
        expect(result.success).toBe(false);
        if (!result.success) {
            // The issue names the offending tag and points at the discriminant, so
            // union-level errors (which surface only this issue) stay actionable.
            expect(result.error.issues).toHaveLength(1);
            expect(result.error.issues[0]).toMatchObject({
                code: "custom",
                path: ["mode"],
            });
            expect(result.error.issues[0].message).toContain('"form"');
        }
    });
});
describe("preserveCustomPayload", () => {
    const inner = z.union([
        z.object({ mode: z.literal("form"), value: z.number() }),
        excludeKnownTags(z.object({ mode: z.string() }), "mode", ["form"]),
    ]);
    const schema = preserveCustomPayload(inner, "mode", ["form"]);
    it("re-attaches unevaluated keys for custom-tagged values", () => {
        const result = schema.parse({ mode: "_vendor", payload: { x: 1 } });
        expect(result).toEqual({ mode: "_vendor", payload: { x: 1 } });
    });
    it("re-attaches payload keys that shadow Object.prototype members", () => {
        // `in`-style presence checks see inherited members; the re-attach must
        // use an own-key check or these vendor keys silently vanish.
        const result = schema.parse(JSON.parse('{"mode":"_vendor","constructor":"tag","toString":"x"}'));
        expect(Object.hasOwn(result, "constructor")).toBe(true);
        expect(result.constructor).toBe("tag");
        expect(result.toString).toBe("x");
    });
    it("never re-attaches __proto__", () => {
        const result = schema.parse(JSON.parse('{"mode":"_vendor","__proto__":{"polluted":true}}'));
        expect(Object.hasOwn(result, "__proto__")).toBe(false);
        expect(result.polluted).toBeUndefined();
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    });
    it("does not re-attach keys for known-tagged values", () => {
        const result = schema.parse({ mode: "form", value: 1, extra: "dropped" });
        expect(result).toEqual({ mode: "form", value: 1 });
    });
    it("skips re-attachment when the tag is not a string", () => {
        const lax = preserveCustomPayload(z.object({ other: z.string() }), "mode", [
            "form",
        ]);
        expect(lax.parse({ other: "x", extra: 1 })).toEqual({ other: "x" });
    });
    it("passes non-object values through the inner schema untouched", () => {
        const passthrough = preserveCustomPayload(z.string(), "mode", ["form"]);
        expect(passthrough.parse("plain")).toBe("plain");
    });
    it("forwards the inner schema's issues with their paths on failure", () => {
        const result = schema.safeParse({ mode: "form", value: "not-a-number" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
            const paths = result.error.issues.map((issue) => issue.path.join("."));
            expect(paths).toContain("mode");
        }
    });
    it("keeps keys the winning member evaluated, even when salvaged", () => {
        // Keys evaluated by the winning member keep their parsed results; keys
        // only a LOSING member would have salvaged arrive raw. This asymmetry is
        // faithful to the schema's unevaluatedProperties semantics — this test
        // pins it so a change is a conscious decision.
        const salvaging = preserveCustomPayload(z.union([
            z.object({ mode: z.literal("form"), meta: z.number().catch(0) }),
            excludeKnownTags(z.object({ mode: z.string() }), "mode", ["form"]),
        ]), "mode", ["form"]);
        expect(salvaging.parse({ mode: "form", meta: "bad" })).toEqual({
            mode: "form",
            meta: 0,
        });
        expect(salvaging.parse({ mode: "_vendor", meta: "raw" })).toEqual({
            mode: "_vendor",
            meta: "raw",
        });
    });
});
//# sourceMappingURL=schema-deserialize.test.js.map