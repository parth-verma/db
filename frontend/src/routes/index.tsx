import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/app-sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { XIcon, PlayIcon, PlusIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Scrollbar } from "react-scrollbars-custom";

import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// @ts-expect-error - Not sure how to fix these errors
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import React, { useRef } from "react";
import { Table } from "@/components/table.tsx";
import { DBConnectionService } from "@main";
import { clsx } from "clsx";
import { useEditorStores, useEditorTabStore } from "@/stores/tabs";

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

function ScrollbarCustom(props: React.PropsWithChildren<unknown>) {
  const [isScrollabrShown, setIsScrollbarShown] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  return (
    <Scrollbar
      noScrollY
      disableTracksWidthCompensation
      removeTrackXWhenNotUsed
      trackXProps={{
        renderer: (props) => {
          const { elementRef, style, ...restProps } = props;
          return (
            <span
              {...restProps}
              ref={elementRef}
              className={clsx(
                "TrackX absolute max-h-1 bg-transparent w-full h-1 transition-opacity",
                {
                  "opacity-0": !isScrollabrShown,
                  "opacity-100": isScrollabrShown,
                },
              )}
            />
          );
        },
      }}
      wrapperProps={{
        renderer: (props) => {
          const { elementRef, ...restProps } = props;
          return (
            <span
              onMouseLeave={() => {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  setIsScrollbarShown(false);
                }, 250);
              }}
              onMouseEnter={() => {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  setIsScrollbarShown(true);
                }, 250);
              }}
              {...restProps}
              ref={elementRef}
              className="ScrollbarsCustom-Wrapper"
            />
          );
        },
      }}
    >
      {props.children}
    </Scrollbar>
  );
}

function EditorTab({ tabId }: { tabId: string }) {
  const title = useEditorTabStore(tabId, (s) => s.title);
  const { order, closeTab } = useEditorStores();
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
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </TabsTrigger>
  );
}

export default function Index() {
  // Tabs header state
  const { order, active, openTab, setActiveTab } = useEditorStores();

  return (
    <ResizablePanelGroup direction="horizontal" className={"flex-1"}>
      <ResizablePanel minSize={20} defaultSize={20} className={"min-h-full"}>
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

function QueryTab({ tabId }) {
  // Tabs store integration
  const activeEditorValue = useEditorTabStore(tabId, (s) => s.editorValue);
  const setEditorValue = useEditorTabStore(tabId, (s) => s.setEditorValue);
  const setResults = useEditorTabStore(tabId, (s) => s.setResults);
  const columnInfo = useEditorTabStore(tabId, (s) => s.columnInfo);
  const rowData = useEditorTabStore(tabId, (s) => s.rowData);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    // here is the editor instance
    // you can store it in `useRef` for further usage
    editorRef.current = editor;
    // Also store it globally for access from sidebar
    editor.updateOptions({
      minimap: { enabled: false },
    });
  }

  function handleRunQuery() {
    if (!editorRef.current) {
      return;
    }
    const query = editorRef.current.getValue();
    const connectionId = localStorage.getItem("activeConnectionId");

    // set loading in active tab store
    setIsLoading(true);
    setError(null);

    if (!connectionId) {
      // If no active connection, redirect to connections page
      window.location.href = "/connections.html";
      return;
    }
    DBConnectionService.RunQuery(connectionId, query)
      .then(([cols, data]) => {
        // Update state with the results for active tab
        setResults(cols || [], data || []);
      })
      .catch((err) => {
        console.error("Error executing query:", err);
        setError(err.toString());

        // If the error is about the connection, redirect to connections page
        if (err.toString().includes("connection not found")) {
          localStorage.removeItem("activeConnectionId");
          setTimeout(() => {
            window.location.href = "/connections.html";
          }, 2000);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel
        minSize={20}
        defaultSize={20}
        collapsible
        collapsedSize={0}
      >
        <div className="relative">
          <Editor
            language={"sql"}
            onMount={handleEditorDidMount}
            theme={"vs-dark"}
            height="90vh"
            value={activeEditorValue}
            onChange={(v) => setEditorValue?.(v ?? "")}
            defaultLanguage="sql"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              onClick={() => (window.location.href = "/connections.html")}
              size="sm"
              variant="outline"
            >
              Switch Connection
            </Button>
            <Button
              onClick={handleRunQuery}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlayIcon className="h-4 w-4 text-white fill-white" />
              Run
            </Button>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={80}
        collapsible
        collapsedSize={0}
      >
        <div className="relative h-full">
          <Table columnInfo={columnInfo} rowData={rowData} />
          {(isLoading || error) && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20">
              {/* Error banner on top of overlay if present */}
              {error && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="m-4 rounded border border-red-300 bg-red-50 text-red-700 px-4 py-2 shadow">
                    Error: {error}
                  </div>
                </div>
              )}
              {/* Center loading indicator */}
              {isLoading && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></span>
                    <span>Loading results...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
