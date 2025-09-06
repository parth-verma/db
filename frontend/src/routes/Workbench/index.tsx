import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/app-sidebar.tsx";
import {Tabs, TabsContent, TabsList} from "@/components/ui/tabs.tsx";
import {Button} from "@/components/ui/button.tsx";
import {PlusIcon} from "lucide-react";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup,} from "@/components/ui/resizable.tsx";
import { useLeftPanel } from "@/contexts/left-panel-context";

import {loader} from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// @ts-expect-error - Not sure how to fix these errors
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import {useEditorStores} from "@/stores/tabs";
import {EditorTab} from "@/routes/Workbench/editor-tab.tsx";
import {ScrollbarCustom} from "@/components/scroll-bar";
import {QueryTab} from "@/routes/Workbench/Editors/query-tab.tsx";

// Declare global editor reference
declare global {
  interface Window {
    sqlEditor: monaco.editor.IStandaloneCodeEditor | undefined;
  }
}

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

loader.config({ monaco });

loader.init();

export default function Index() {
  // Tabs header state
  const { order, active, openTab, setActiveTab } = useEditorStores();
  const { leftPanelRef } = useLeftPanel();

  return (
    <ResizablePanelGroup direction="horizontal" className={"flex-1"}>
      <ResizablePanel
          // @ts-expect-error - Figure out the correct types for
        ref={leftPanelRef}
        minSize={20}
        collapsedSize={0}
        defaultSize={20}
        collapsible
        className={"min-h-full"}
      >
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel minSize={30} defaultSize={80}>
        <Tabs
          value={active ?? undefined}
          onValueChange={setActiveTab}
          className="w-full h-full bg-muted"
        >
          <TabsList
            className={"w-full rounded-none justify-between pr-1 border-b pt-0"}
          >
            <ScrollbarCustom>
              <div className="flex items-center">
                {order.map((id) => (
                  <EditorTab tabId={id} key={id} />
                ))}
              </div>
            </ScrollbarCustom>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => {
                openTab({});
              }}
              aria-label="New tab"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </TabsList>
          {order.map((id) => (
            <TabsContent key={id} className={"text-foreground"} value={id}>
              {" "}
              <QueryTab key={id} tabId={id} />
            </TabsContent>
          ))}
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

