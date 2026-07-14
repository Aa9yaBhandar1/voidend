import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
    getDataDir,
    getData,
    generateAndSaveData,
    invalidateEndpointData,
    deleteProjectData,
} from "./endpoint-data-store";

describe("getDataDir", () => {
    const originalPlatform = process.platform;
    const originalEnv = { ...process.env };

    afterEach(() => {
        Object.defineProperty(process, "platform", { value: originalPlatform });
        process.env = { ...originalEnv };
    });

    it("uses XDG_DATA_HOME on linux when set", () => {
        Object.defineProperty(process, "platform", { value: "linux" });
        process.env.XDG_DATA_HOME = "/custom/xdg";
        expect(getDataDir()).toBe(path.join("/custom/xdg", "voidend"));
    });

    it("falls back to ~/.local/share on linux when XDG_DATA_HOME is unset", () => {
        Object.defineProperty(process, "platform", { value: "linux" });
        delete process.env.XDG_DATA_HOME;
        expect(getDataDir()).toBe(path.join(os.homedir(), ".local/share", "voidend"));
    });

    it("uses Library/Application Support on darwin", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        expect(getDataDir()).toBe(path.join(os.homedir(), "Library/Application Support/voidend"));
    });

    it("uses APPDATA on win32 when set", () => {
        Object.defineProperty(process, "platform", { value: "win32" });
        process.env.APPDATA = "C:\\Users\\test\\AppData\\Roaming";
        expect(getDataDir()).toBe(path.join("C:\\Users\\test\\AppData\\Roaming", "voidend"));
    });

    it("falls back to homedir on win32 when APPDATA is unset", () => {
        Object.defineProperty(process, "platform", { value: "win32" });
        delete process.env.APPDATA;
        expect(getDataDir()).toBe(path.join(os.homedir(), "voidend"));
    });

    it("falls back to ~/.voidend on unknown platforms", () => {
        Object.defineProperty(process, "platform", { value: "freebsd" });
        expect(getDataDir()).toBe(path.join(os.homedir(), ".voidend"));
    });
});

describe("endpoint-data-store (file operations)", () => {
    let tempDir: string;

    beforeEach(() => {
        // Isolate real fs operations into a temp dir via XDG_DATA_HOME (linux path used in CI)
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "voidend-test-"));
        Object.defineProperty(process, "platform", { value: "linux" });
        process.env.XDG_DATA_HOME = tempDir;
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    describe("getData", () => {
        it("returns null when no data file exists", () => {
            expect(getData("proj1", "endpoint1")).toBe(null);
        });

        it("returns parsed JSON when data file exists", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "static" }, 1);
            expect(getData("proj1", "endpoint1")).toEqual({ name: "static" });
        });
    });

    describe("generateAndSaveData", () => {
        it("creates the project directory if it does not exist", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "static" }, 1);
            const dir = path.join(tempDir, "voidend", "proj1");
            expect(fs.existsSync(dir)).toBe(true);
        });

        it("writes resolved single-object data when count is 1", () => {
            const result = generateAndSaveData("proj1", "endpoint1", { name: "static" }, 1);
            expect(result).toEqual({ name: "static" });
            expect(getData("proj1", "endpoint1")).toEqual({ name: "static" });
        });

        it("writes resolved array data when count > 1", () => {
            const result = generateAndSaveData(
                "proj1",
                "endpoint1",
                { name: "static" },
                3,
            ) as unknown[];
            expect(result).toHaveLength(3);
            expect(getData("proj1", "endpoint1")).toEqual(result);
        });

        it("overwrites existing data on repeated calls", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "first" }, 1);
            generateAndSaveData("proj1", "endpoint1", { name: "second" }, 1);
            expect(getData("proj1", "endpoint1")).toEqual({ name: "second" });
        });

        it("keeps data for different endpoints within the same project isolated", () => {
            generateAndSaveData("proj1", "endpointA", { name: "a" }, 1);
            generateAndSaveData("proj1", "endpointB", { name: "b" }, 1);
            expect(getData("proj1", "endpointA")).toEqual({ name: "a" });
            expect(getData("proj1", "endpointB")).toEqual({ name: "b" });
        });

        it("keeps data for different projects isolated", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "p1" }, 1);
            generateAndSaveData("proj2", "endpoint1", { name: "p2" }, 1);
            expect(getData("proj1", "endpoint1")).toEqual({ name: "p1" });
            expect(getData("proj2", "endpoint1")).toEqual({ name: "p2" });
        });
    });

    describe("invalidateEndpointData", () => {
        it("removes an existing data file", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "static" }, 1);
            invalidateEndpointData("proj1", "endpoint1");
            expect(getData("proj1", "endpoint1")).toBe(null);
        });

        it("does nothing (no throw) when the file does not exist", () => {
            expect(() => invalidateEndpointData("proj1", "nonexistent")).not.toThrow();
        });

        it("does not affect other endpoints in the same project", () => {
            generateAndSaveData("proj1", "endpointA", { name: "a" }, 1);
            generateAndSaveData("proj1", "endpointB", { name: "b" }, 1);
            invalidateEndpointData("proj1", "endpointA");
            expect(getData("proj1", "endpointA")).toBe(null);
            expect(getData("proj1", "endpointB")).toEqual({ name: "b" });
        });
    });

    describe("deleteProjectData", () => {
        it("removes the entire project directory", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "static" }, 1);
            deleteProjectData("proj1");
            const dir = path.join(tempDir, "voidend", "proj1");
            expect(fs.existsSync(dir)).toBe(false);
        });

        it("removes all endpoints within the project", () => {
            generateAndSaveData("proj1", "endpointA", { name: "a" }, 1);
            generateAndSaveData("proj1", "endpointB", { name: "b" }, 1);
            deleteProjectData("proj1");
            expect(getData("proj1", "endpointA")).toBe(null);
            expect(getData("proj1", "endpointB")).toBe(null);
        });

        it("does nothing (no throw) when the project directory does not exist", () => {
            expect(() => deleteProjectData("nonexistent")).not.toThrow();
        });

        it("does not affect other projects", () => {
            generateAndSaveData("proj1", "endpoint1", { name: "p1" }, 1);
            generateAndSaveData("proj2", "endpoint1", { name: "p2" }, 1);
            deleteProjectData("proj1");
            expect(getData("proj1", "endpoint1")).toBe(null);
            expect(getData("proj2", "endpoint1")).toEqual({ name: "p2" });
        });
    });
});
