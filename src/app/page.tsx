import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
    const health = await api.health.check();

    return (
        <HydrateClient>
            <main>
                <h1>ghostEnd</h1>
                <p>api: {health.status}</p>
                <p>db: {health.db}</p>
            </main>
        </HydrateClient>
    );
}
