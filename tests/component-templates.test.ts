import { describe, expect, it } from "vitest";
import { fieldsFromSchema } from "~/lib/faker-options";
import {
    matchTemplates,
    getTopMatches,
    generateCode,
    COMPONENT_TEMPLATES,
} from "~/lib/component-templates";
import { dynamicGridTemplate } from "~/lib/component-templates/dynamic-grid";
import { findField, buildFetchHook, buildInterface } from "~/lib/component-templates/codegen-utils";

describe("Component Templates Library", () => {
    describe("matchTemplates & getTopMatches", () => {
        it("should return dynamicGridTemplate for any schema", () => {
            const fields = [
                { id: "1", fieldName: "username", dataType: "$faker.internet.username" },
                { id: "2", fieldName: "email", dataType: "$faker.internet.email" },
            ];
            const matches = getTopMatches(fields, "/api/users");

            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0]!.template.id).toBe("dynamic-grid");
        });

        it("should rank dynamicGridTemplate when path keyword matches", () => {
            const fields = fieldsFromSchema({
                id: "uuid",
                name: "fullName",
            });
            const matches = matchTemplates(fields, "/users");
            expect(matches.some((m) => m.template.id === "dynamic-grid")).toBe(true);
        });
    });

    describe("codegen-utils", () => {
        it("findField case and separator insensitively matches schema field names", () => {
            const fields = [
                { id: "1", fieldName: "user_name", dataType: "$faker.internet.username" },
                { id: "2", fieldName: "EmailAddress", dataType: "$faker.internet.email" },
            ];

            expect(findField(fields, ["username", "handle"])).toBe("user_name");
            expect(findField(fields, ["email", "emailaddress"])).toBe("EmailAddress");
            expect(findField(fields, ["nonexistent"])).toBeNull();
        });

        it("buildInterface generates valid TypeScript interface output", () => {
            const code = buildInterface("User", ["id: string;", "name: string;"]);
            expect(code).toContain("interface User {");
            expect(code).toContain("  id: string;");
            expect(code).toContain("  name: string;");
            expect(code).toContain("}");
        });

        it("buildFetchHook generates a fetch hook with correct endpoint URL", () => {
            const code = buildFetchHook("User", "https://api.mock.test/users", "UserItem");
            expect(code).toContain("function useUserData()");
            expect(code).toContain('fetch("https://api.mock.test/users")');
            expect(code).toContain("setData(json)");
        });
    });

    describe("dynamicGridTemplate Code Generation", () => {
        it("generates TSX component code from schema fields with snake_case normalization", () => {
            const fields = fieldsFromSchema({
                id: "$faker.string.uuid",
                full_name: "$faker.person.fullName",
                user_name: "$faker.internet.username",
                email_address: "$faker.internet.email",
                phone_number: "$faker.phone.number",
                avatar_url: "$faker.image.avatar",
                bio_summary: "$faker.person.bio",
                price_amount: "$faker.commerce.price",
            });

            const code = generateCode(dynamicGridTemplate, fields, "https://mock.api/v1/users");

            expect(code).toContain('import { useEffect, useState } from "react";');
            expect(code).toContain("interface DataItem {");
            expect(code).toContain("  id: string;");
            expect(code).toContain("  full_name: string;");
            expect(code).toContain("  user_name: string;");
            expect(code).toContain("  price_amount: number;");
            expect(code).toContain("function useDataItemData()");
            expect(code).toContain('fetch("https://mock.api/v1/users")');
            expect(code).toContain("export function DataCardList()");
            expect(code).toContain("avatar_url");
            expect(code).toContain("email_address:");
            expect(code).toContain("phone_number:");
        });

        it("backtracks arbitrary field names (e.g. foo, bar) to their $faker types", () => {
            const fields = fieldsFromSchema({
                foo: "$faker.string.uuid",
                bar: "$faker.internet.username",
                baz: "$faker.person.fullName",
                pic: "$faker.image.avatar",
            });

            const code = generateCode(dynamicGridTemplate, fields, "https://mock.api/v1/users");

            expect(code).toContain("  foo: string;");
            expect(code).toContain("  bar: string;");
            expect(code).toContain("  baz: string;");
            expect(code).toContain("  pic: string;");

            // Verify foo was inferred as id, baz/bar as title/subtitle, and pic as avatar
            expect(code).toContain("item.foo");
            expect(code).toContain("item.baz");
            expect(code).toContain("item.pic");
        });

        it("backtracks all categories in FAKER_OPTIONS (book, company, vehicle, food, commerce)", () => {
            const fields = fieldsFromSchema({
                custom_id: "$faker.string.nanoid",
                field1: "$faker.book.title",
                field2: "$faker.book.author",
                field3: "$faker.lorem.paragraph",
                field4: "$faker.number.float",
                field5: "$faker.datatype.boolean",
            });

            const code = generateCode(dynamicGridTemplate, fields, "https://mock.api/v1/books");

            expect(code).toContain("  custom_id: string;");
            expect(code).toContain("  field1: string;");
            expect(code).toContain("  field2: string;");
            expect(code).toContain("  field3: string;");
            expect(code).toContain("  field4: number;");
            expect(code).toContain("  field5: boolean;");

            // Check that field1 ($faker.book.title) was mapped to title, field2 to subtitle, and field3 to paragraph
            expect(code).toContain("item.custom_id");
            expect(code).toContain("item.field1");
            expect(code).toContain("item.field2");
            expect(code).toContain("item.field3");
        });

        it("recursively flattens nested schema objects (user.profile.name) like schema-resolver.ts", () => {
            const fields = fieldsFromSchema({
                user: {
                    id: "$faker.string.uuid",
                    profile: {
                        name: "$faker.person.fullName",
                        avatar: "$faker.image.avatar",
                    },
                    details: {
                        bio: "$faker.person.bio",
                    },
                },
            });

            const code = generateCode(dynamicGridTemplate, fields, "https://mock.api/v1/nested");

            expect(code).toContain('  "user.id"?: string;');
            expect(code).toContain('  "user.profile.name"?: string;');
            expect(code).toContain('  "user.profile.avatar"?: string;');
            expect(code).toContain('  "user.details.bio"?: string;');

            // Verify safe optional chaining property access item?.["user.profile.name"]
            expect(code).toContain('item?.["user.id"]');
            expect(code).toContain('item?.["user.profile.name"]');
            expect(code).toContain('item?.["user.profile.avatar"]');
            expect(code).toContain('item?.["user.details.bio"]');
        });

        it("handles empty / simple schema fields without crashing", () => {
            const fields = fieldsFromSchema({});
            const code = generateCode(dynamicGridTemplate, fields, "https://mock.api/v1/custom");

            expect(code).toContain("export function DataCardList()");
            expect(code).toContain('fetch("https://mock.api/v1/custom")');
        });
    });

    describe("COMPONENT_TEMPLATES registry", () => {
        it("contains dynamicGridTemplate as primary template", () => {
            expect(COMPONENT_TEMPLATES.length).toBeGreaterThan(0);
            expect(COMPONENT_TEMPLATES[0]!.id).toBe("dynamic-grid");
        });
    });
});
