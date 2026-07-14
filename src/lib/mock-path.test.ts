import { describe, it, expect, afterEach, vi } from "vitest";
import {
    cleanSegment,
    joinPath,
    normalizeBasePath,
    stripBasePath,
    matchPath,
    buildMockPath,
    buildMockUrl,
    getMockOrigin,
} from "./mock-path";

describe("cleanSegment", () => {
    it("strips leading slashes", () => {
        expect(cleanSegment("///users")).toBe("users");
    });

    it("strips trailing slashes", () => {
        expect(cleanSegment("users///")).toBe("users");
    });

    it("strips both leading and trailing slashes", () => {
        expect(cleanSegment("/users/")).toBe("users");
    });

    it("returns empty string unchanged", () => {
        expect(cleanSegment("")).toBe("");
    });

    it("returns a segment with no slashes unchanged", () => {
        expect(cleanSegment("users")).toBe("users");
    });

    it("does not touch internal slashes", () => {
        expect(cleanSegment("/users/123/")).toBe("users/123");
    });
});

describe("joinPath", () => {
    it("joins multiple simple segments", () => {
        expect(joinPath("api", "v1", "users")).toBe("/api/v1/users");
    });

    it('returns "/" when given no segments', () => {
        expect(joinPath()).toBe("/");
    });

    it('returns "/" when all segments are empty/null/undefined', () => {
        expect(joinPath("", null, undefined)).toBe("/");
    });

    it("filters out empty segments among valid ones", () => {
        expect(joinPath("api", "", "users")).toBe("/api/users");
    });

    it("filters out null and undefined segments among valid ones", () => {
        expect(joinPath("api", null, "users", undefined)).toBe("/api/users");
    });

    it("cleans slashes within each segment before joining", () => {
        expect(joinPath("/api/", "/v1/", "/users/")).toBe("/api/v1/users");
    });

    it("handles a single segment", () => {
        expect(joinPath("users")).toBe("/users");
    });
});

describe("normalizeBasePath", () => {
    it("returns empty string for undefined", () => {
        expect(normalizeBasePath(undefined)).toBe("");
    });

    it("returns empty string for null", () => {
        expect(normalizeBasePath(null)).toBe("");
    });

    it('returns empty string for "/"', () => {
        expect(normalizeBasePath("/")).toBe("");
    });

    it("returns empty string for empty string", () => {
        expect(normalizeBasePath("")).toBe("");
    });

    it("normalizes a simple base path", () => {
        expect(normalizeBasePath("/api/v1")).toBe("/api/v1");
    });

    it("adds leading slash if missing", () => {
        expect(normalizeBasePath("api/v1")).toBe("/api/v1");
    });

    it("strips trailing slash", () => {
        expect(normalizeBasePath("/api/v1/")).toBe("/api/v1");
    });
});

describe("stripBasePath", () => {
    it("returns incoming path unchanged when basePath is empty/root", () => {
        expect(stripBasePath("/users/123", "/")).toBe("/users/123");
    });

    it("returns incoming path unchanged when basePath is undefined", () => {
        expect(stripBasePath("/users/123", undefined)).toBe("/users/123");
    });

    it("strips a matching basePath prefix", () => {
        expect(stripBasePath("/api/v1/users", "/api/v1")).toBe("/users");
    });

    it('returns "/" when incoming path equals the basePath exactly', () => {
        expect(stripBasePath("/api/v1", "/api/v1")).toBe("/");
    });

    it("returns incoming path unchanged when it does not start with basePath", () => {
        expect(stripBasePath("/other/users", "/api/v1")).toBe("/other/users");
    });

    it("does not falsely strip a prefix-like but non-matching path", () => {
        expect(stripBasePath("/api/v10/users", "/api/v1")).toBe("/api/v10/users");
    });
});

describe("matchPath", () => {
    it("matches an exact static path", () => {
        expect(matchPath("/users", "/users")).toBe(true);
    });

    it("does not match a different static path", () => {
        expect(matchPath("/users", "/posts")).toBe(false);
    });

    it("matches a path with a single param", () => {
        expect(matchPath("/users/:id", "/users/123")).toBe(true);
    });

    it("matches a path with multiple params", () => {
        expect(matchPath("/users/:userId/posts/:postId", "/users/1/posts/99")).toBe(true);
    });

    it("does not match when incoming has extra segments", () => {
        expect(matchPath("/users/:id", "/users/123/extra")).toBe(false);
    });

    it("does not match when incoming has fewer segments", () => {
        expect(matchPath("/users/:id", "/users")).toBe(false);
    });

    it("does not match a param segment against an empty segment", () => {
        expect(matchPath("/users/:id", "/users/")).toBe(false);
    });
});

describe("buildMockPath", () => {
    it("joins basePath and endpoint path", () => {
        expect(buildMockPath("/api/v1", "/users")).toBe("/api/v1/users");
    });

    it("works with no basePath", () => {
        expect(buildMockPath(undefined, "/users")).toBe("/users");
    });

    it("works with no basePath and messy slashes", () => {
        expect(buildMockPath(null, "///users///")).toBe("/users");
    });
});

describe("buildMockUrl", () => {
    it("builds a full mock URL with basePath", () => {
        expect(buildMockUrl("http://localhost:3000", "proj1", "/api/v1", "/users")).toBe(
            "http://localhost:3000/mock/proj1/api/v1/users",
        );
    });

    it("builds a full mock URL without basePath", () => {
        expect(buildMockUrl("http://localhost:3000", "proj1", undefined, "/users")).toBe(
            "http://localhost:3000/mock/proj1/users",
        );
    });
});

describe("getMockOrigin", () => {
    const originalWindow = globalThis.window;
    const originalEnv = { ...process.env };
    afterEach(() => {
        if (originalWindow === undefined) {
            // @ts-expect-error cleaning up test-only global
            delete globalThis.window;
        } else {
            globalThis.window = originalWindow;
        }
        process.env = { ...originalEnv };
        vi.unstubAllGlobals();
    });
    it("returns window.location.origin when window is defined", () => {
        vi.stubGlobal("window", { location: { origin: "http://browser-origin.test" } });
        expect(getMockOrigin()).toBe("http://browser-origin.test");
    });
    it("falls back to localhost with default port when no window and no PORT set", () => {
        // @ts-expect-error simulating server (no window) environment
        delete globalThis.window;
        delete process.env.PORT;
        expect(getMockOrigin()).toBe("http://localhost:3000");
    });
    it("uses process.env.PORT when set and no window", () => {
        // @ts-expect-error simulating server (no window) environment
        delete globalThis.window;
        process.env.PORT = "4000";
        expect(getMockOrigin()).toBe("http://localhost:4000");
    });
});
