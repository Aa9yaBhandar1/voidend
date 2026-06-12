import { HydrateClient } from "~/trpc/server";
import { ApiClientLayout } from "./_components/api-client/layout";
import { ModeToggle } from "~/components/mode-toggle";

export default async function Home() {
    return (
        <HydrateClient>
            <main className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col">
                <header className="flex items-center justify-between p-4 border-b">
                    <div className="font-bold text-xl">ghostEnd</div>
                    <ModeToggle />
                </header>
                <ApiClientLayout />
            </main>
        </HydrateClient>
    );
}
