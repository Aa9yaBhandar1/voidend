"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { SendIcon } from "lucide-react";

export function RequestBar() {
    return (
        <div className="p-4 flex gap-2 border-b bg-muted/5">
            <Select defaultValue="GET">
                <SelectTrigger className="w-[120px] font-semibold tracking-wide">
                    <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="GET" className="text-green-500 font-bold">
                        GET
                    </SelectItem>
                    <SelectItem value="POST" className="text-yellow-500 font-bold">
                        POST
                    </SelectItem>
                    <SelectItem value="PUT" className="text-blue-500 font-bold">
                        PUT
                    </SelectItem>
                    <SelectItem value="PATCH" className="text-purple-500 font-bold">
                        PATCH
                    </SelectItem>
                    <SelectItem value="DELETE" className="text-red-500 font-bold">
                        DELETE
                    </SelectItem>
                </SelectContent>
            </Select>

            <Input
                className="flex-1 font-mono text-sm"
                placeholder="Enter request URL"
                defaultValue="http://localhost:8080/ghostEnd/users/1"
            />

            <Button className="gap-2 px-6 bg-blue-600 hover:bg-blue-700 text-white">
                Send
                <SendIcon className="h-4 w-4" />
            </Button>
        </div>
    );
}
