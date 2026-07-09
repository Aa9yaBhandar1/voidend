"use client";
import { useState } from "react";
import { ApiClientLayout } from "~/modules/workspace/ui/layouts/workspace-layout";

export function ProjectsView() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <main className="h-screen w-full bg-background text-foreground overflow-hidden">
            <ApiClientLayout isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((v) => !v)} />
        </main>
    );
}
