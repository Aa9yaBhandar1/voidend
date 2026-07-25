export function isolatePlatformEnv() {
    const originalPlatform = process.platform;
    const originalEnv = { ...process.env };
    return {
        setPlatform: (value: NodeJS.Platform) =>
            Object.defineProperty(process, "platform", { value, configurable: true }),
        restore: () => {
            Object.defineProperty(process, "platform", {
                value: originalPlatform,
                configurable: true,
            });
            process.env = { ...originalEnv };
        },
    };
}
