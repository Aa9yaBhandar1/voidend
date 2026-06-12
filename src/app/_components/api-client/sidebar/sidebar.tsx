"use client";

import { ScrollArea } from "~/components/ui/scroll-area";
import { FolderIcon, PlusIcon } from "lucide-react";
import { CollectionItem } from "./collection-item";
import { Button } from "~/components/ui/button";

export function Sidebar() {
  return (
    <div className="h-full w-full flex flex-col bg-muted/10 border-r">
      <div className="p-4 border-b flex items-center justify-between font-semibold">
        <span>Folders</span>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="p-2">
        <div className="space-y-1">
          <CollectionItem
            name="Facebook"
            icon={<FolderIcon className="h-4 w-4 text-blue-500" />}
          />
          <CollectionItem
            name="Daraz Clone"
            icon={<FolderIcon className="h-4 w-4 text-orange-500" />}
          />

          <CollectionItem
            name="ghostEnd"
            icon={<FolderIcon className="h-4 w-4 text-green-500" />}
          >
            <div className="pl-4 space-y-1 mt-1 border-l ml-2 border-border/50">
              <CollectionItem name="/users" method="GET" />
              <CollectionItem name="/projects" method="GET" />
              <CollectionItem name="/endpoints" defaultOpen={true}>
                <div className="pl-4 space-y-1 mt-1 border-l ml-2 border-border/50">
                  <CollectionItem name="/endpoints" isEndpoint method="GET" />
                  <CollectionItem name="/endpoints" isEndpoint method="POST" />
                  <CollectionItem name="/endpoints" isEndpoint method="PATCH" />
                </div>
              </CollectionItem>
            </div>
          </CollectionItem>
        </div>
      </ScrollArea>
    </div>
  );
}
