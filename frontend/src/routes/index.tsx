import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/app-sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { XIcon, PlayIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// @ts-expect-error - Not sure how to fix these errors
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { useRef, useState } from "react";
import { Table } from "@/components/table.tsx";
import { DBConnectionService } from "@main";
import { columns } from "../../bindings/changeme/internal";

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
  // State for storing query results
  const [columnInfo, setColumnInfo] = useState<columns[]>([]);
  const [rowData, setRowData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    // here is the editor instance
    // you can store it in `useRef` for further usage
    editorRef.current = editor;
    // Also store it globally for access from sidebar
    window.sqlEditor = editor;
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
    setIsLoading(true);
    setError(null);
    if (!connectionId) {
      // If no active connection, redirect to connections page
      window.location.href = "/connections.html";
      return;
    }
    DBConnectionService.RunQuery(connectionId, query)
        .then(([columns, data]) => {
          // Update state with the results
          setColumnInfo(columns || []);
          setRowData(data || []);
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
      <ResizablePanelGroup direction="horizontal" className={"flex-1"}>
        <ResizablePanel minSize={20} defaultSize={20} className={"min-h-full"}>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={30} defaultSize={80}>
        <Tabs defaultValue="query" className="w-full h-full bg-muted">
          <TabsList className={"w-full rounded-none"}>
            <TabsTrigger
              className={"justify-between max-w-[150px]"}
              value="query"
            >
              SQL Query{" "}
              <div className={"justify-self-end"}>
                <XIcon />
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent className={"text-foreground"} value="query">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel minSize={20} defaultSize={20}>
                <div className="relative">
                  <Editor
                    language={"sql"}
                    onMount={handleEditorDidMount}
                    theme={"vs-dark"}
                    height="90vh"
                    defaultValue="-- Enter your SQL query here"
                    defaultLanguage="sql"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      onClick={() =>
                        (window.location.href = "/connections.html")
                      }
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
              <ResizablePanel minSize={20} defaultSize={80}>
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
          </TabsContent>
        </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
  );
}
