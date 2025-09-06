import {useEditorTabStore} from "@/stores/tabs";
import React, {useRef} from "react";
import * as monaco from "monaco-editor";
import {DBConnectionService} from "@main";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable.tsx";
import {Editor} from "@monaco-editor/react";
import {Button} from "@/components/ui/button.tsx";
import {PlayIcon} from "lucide-react";
import {Table} from "@/components/table.tsx";

export function QueryTab({tabId}) {
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
            minimap: {enabled: false},
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
                            <PlayIcon className="h-4 w-4 text-white fill-white"/>
                            Run
                        </Button>
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle/>
            <ResizablePanel
                minSize={20}
                defaultSize={80}
                collapsible
                collapsedSize={0}
            >
                <div className="relative h-full">
                    <Table columnInfo={columnInfo} rowData={rowData}/>
                    {(isLoading || error) && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20">
                            {/* Error banner on top of overlay if present */}
                            {error && (
                                <div className="absolute top-0 left-0 right-0">
                                    <div
                                        className="m-4 rounded border border-red-300 bg-red-50 text-red-700 px-4 py-2 shadow">
                                        Error: {error}
                                    </div>
                                </div>
                            )}
                            {/* Center loading indicator */}
                            {isLoading && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <span
                                            className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></span>
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