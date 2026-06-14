"use client";

import { ApiClientLayout } from "~/modules/workspace/ui/layouts/workspace-layout";
import { ModeToggle } from "~/components/mode-toggle";

export function ProjectsView() {
    return (
        <main className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col">
            <header className="flex items-center justify-between p-4 border-b">
                <div className="font-bold text-xl">ghostEnd</div>
                <ModeToggle />
            </header>
            <ApiClientLayout />
        </main>
    );
}
