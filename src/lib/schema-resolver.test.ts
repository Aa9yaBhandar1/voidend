import { describe, it, expect } from "vitest";
import { resolveSchema, resolveResponseData } from "./schema-resolver";

describe("resolveSchema", () => {
    it("returns plain strings unchanged", () => {
        expect(resolveSchema("hello")).toBe("hello");
    });

    it("returns numbers unchanged", () => {
        expect(resolveSchema(42)).toBe(42);
    });

    it("returns booleans unchanged", () => {
        expect(resolveSchema(true)).toBe(true);
    });

    it("returns null unchanged", () => {
        expect(resolveSchema(null)).toBe(null);
    });

    it("returns undefined unchanged", () => {
        expect(resolveSchema(undefined)).toBe(undefined);
    });

    it("resolves a valid $faker path to a value", () => {
        const result = resolveSchema("$faker.person.firstName");
        expect(typeof result).toBe("string");
        expect(result).not.toBe("$faker.person.firstName");
    });

    it("resolves a deeper $faker path (internet.email)", () => {
        const result = resolveSchema("$faker.internet.email");
        expect(typeof result).toBe("string");
        expect(result).toContain("@");
    });

    it("returns null for an invalid/nonexistent $faker path", () => {
        expect(resolveSchema("$faker.notReal.nope")).toBe(null);
    });

    it("returns null when $faker path points to a non-function (namespace, not leaf)", () => {
        expect(resolveSchema("$faker.person")).toBe(null);
    });

    it('does not treat a string merely containing "faker" as a directive', () => {
        expect(resolveSchema("this is not $faker.anything really")).toBe(
            "this is not $faker.anything really",
        );
    });

    it("resolves a plain array by mapping resolveSchema over each item", () => {
        const input = ["a", 1, true];
        expect(resolveSchema(input)).toEqual(["a", 1, true]);
    });

    it("resolves an empty array to an empty array", () => {
        expect(resolveSchema([])).toEqual([]);
    });

    it("resolves a nested array of objects", () => {
        const input = [{ name: "x" }, { name: "y" }];
        expect(resolveSchema(input)).toEqual([{ name: "x" }, { name: "y" }]);
    });

    it("resolves $array with explicit $count", () => {
        const result = resolveSchema({ $array: "static", $count: 5 }) as unknown[];
        expect(result).toHaveLength(5);
        expect(result.every((v) => v === "static")).toBe(true);
    });

    it("defaults $array to count 3 when $count is omitted", () => {
        const result = resolveSchema({ $array: "x" }) as unknown[];
        expect(result).toHaveLength(3);
    });

    it("resolves $array with $count: 0 to an empty array", () => {
        const result = resolveSchema({ $array: "x", $count: 0 }) as unknown[];
        expect(result).toHaveLength(0);
    });

    it("resolves $array whose template is an object (nested)", () => {
        const result = resolveSchema({
            $array: { id: "$faker.string.uuid", name: "static" },
            $count: 2,
        }) as Array<{ id: string; name: string }>;
        expect(result).toHaveLength(2);
        result.forEach((item) => {
            expect(typeof item.id).toBe("string");
            expect(item.name).toBe("static");
        });
    });

    it("resolves a simple flat object", () => {
        const input = { name: "static", age: 30 };
        expect(resolveSchema(input)).toEqual({ name: "static", age: 30 });
    });

    it("resolves an empty object to an empty object", () => {
        expect(resolveSchema({})).toEqual({});
    });

    it("resolves a multi-level nested object", () => {
        const input = {
            user: {
                profile: {
                    contact: {
                        email: "static@test.com",
                    },
                },
            },
        };
        expect(resolveSchema(input)).toEqual(input);
    });

    it("resolves an object mixing faker fields, static fields, and nested $array", () => {
        const input = {
            id: "$faker.string.uuid",
            label: "fixed",
            tags: { $array: "$faker.word.noun", $count: 2 },
        };
        const result = resolveSchema(input) as {
            id: string;
            label: string;
            tags: string[];
        };
        expect(typeof result.id).toBe("string");
        expect(result.label).toBe("fixed");
        expect(result.tags).toHaveLength(2);
        result.tags.forEach((t) => expect(typeof t).toBe("string"));
    });

    it("handles deeply nested arrays-of-objects-containing-arrays", () => {
        const input = {
            $array: {
                id: "$faker.string.uuid",
                children: { $array: "leaf", $count: 2 },
            },
            $count: 2,
        };
        const result = resolveSchema(input) as Array<{
            id: string;
            children: string[];
        }>;
        expect(result).toHaveLength(2);
        result.forEach((item) => {
            expect(typeof item.id).toBe("string");
            expect(item.children).toEqual(["leaf", "leaf"]);
        });
    });
});

describe("resolveResponseData", () => {
    it("returns a single resolved object when count is 1", () => {
        const schema = { name: "static" };
        expect(resolveResponseData(schema, 1)).toEqual({ name: "static" });
    });

    it("returns a single resolved object when count is 0 (not > 1)", () => {
        const schema = { name: "static" };
        expect(resolveResponseData(schema, 0)).toEqual({ name: "static" });
    });

    it("returns an array of resolved objects when count > 1", () => {
        const schema = { name: "static" };
        const result = resolveResponseData(schema, 4) as unknown[];
        expect(result).toHaveLength(4);
        expect(result).toEqual([
            { name: "static" },
            { name: "static" },
            { name: "static" },
            { name: "static" },
        ]);
    });

    it("produces distinct faker values across array items when count > 1", () => {
        const schema = { id: "$faker.string.uuid" };
        const result = resolveResponseData(schema, 5) as Array<{ id: string }>;
        const ids = result.map((r) => r.id);
        expect(new Set(ids).size).toBe(5);
    });
});
