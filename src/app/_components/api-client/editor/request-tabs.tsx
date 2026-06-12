"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";

export function RequestTabs() {
    return (
        <div className="flex-1 flex flex-col p-4">
            <Tabs defaultValue="body" className="flex-1 flex flex-col">
                <TabsList className="w-fit mb-4">
                    <TabsTrigger value="params">Params</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="body">Body</TabsTrigger>
                    <TabsTrigger value="auth">Auth</TabsTrigger>
                </TabsList>

                <TabsContent value="body" className="flex-1 mt-0">
                    <Textarea
                        placeholder="Enter JSON body/schema here..."
                        className="h-full min-h-[150px] font-mono text-sm resize-none"
                    />
                </TabsContent>

                <TabsContent value="params" className="flex-1 mt-0">
                    <div className="text-sm text-muted-foreground border border-dashed rounded-md p-8 text-center flex items-center justify-center h-full">
                        Key-Value table for query parameters goes here
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
