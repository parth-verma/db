import {useEditorStores, useEditorTabStore} from "@/stores/tabs";
import {TabsTrigger} from "@/components/ui/tabs.tsx";
import {XIcon} from "lucide-react";
import React from "react";

export function EditorTab({tabId}: { tabId: string }) {
    const title = useEditorTabStore(tabId, (s) => s.title);
    const {order, closeTab} = useEditorStores();
    const canCloseTabs = order.length > 1;

    return (
        <TabsTrigger
            className={
                "group justify-between max-w-[180px] rounded-none data-[state=active]:rounded-md gap-2 px-3 border border-l-border"
            }
            value={tabId}
        >
            <span className="truncate">{title}</span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (canCloseTabs) closeTab(tabId);
                }}
                className="ml-2 inline-flex items-center opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity"
                aria-label="Close tab"
                disabled={!canCloseTabs}
            >
                <XIcon className="h-3.5 w-3.5"/>
            </button>
        </TabsTrigger>
    );
}