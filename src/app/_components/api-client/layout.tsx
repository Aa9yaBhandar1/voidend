"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { Sidebar } from "./sidebar/sidebar";
import { RequestBar } from "./editor/request-bar";
import { RequestTabs } from "./editor/request-tabs";
import { ResponseView } from "./editor/response-view";

export function ApiClientLayout() {
    return (
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full border">
            {/* Sidebar Panel */}
            <ResizablePanel defaultSize={40}>
                <Sidebar />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Main Request/Response Area */}
            <ResizablePanel defaultSize={80}>
                <ResizablePanelGroup orientation="vertical">
                    {/* Request Section */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full bg-background">
                            <RequestBar />
                            <RequestTabs />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Response Section */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <ResponseView />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
