import {useEditorTabStore} from "@/stores/tabs";
import {useRef} from "react";
import {DBConnectionService} from "@main";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable.tsx";
import {Editor} from "@monaco-editor/react";
import {Button} from "@/components/ui/button.tsx";
import {PlayIcon} from "lucide-react";
import {Table, TableRef} from "@/components/table.tsx";
import {useMutation} from "@tanstack/react-query";
import type {columns} from "../../../../bindings/changeme/internal.ts";
import * as monaco from "monaco-editor";
// @ts-expect-error - Not sure how to fix these errors
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import {loader} from "@monaco-editor/react";

self.MonacoEnvironment = {
    getWorker() {
        return new editorWorker();
    },
};

loader.config({ monaco });

loader.init();

// Declare global editor reference
declare global {
    interface Window {
        sqlEditor: monaco.editor.IStandaloneCodeEditor | undefined;
    }
}

export function QueryTab({tabId}) {
    // Tabs store integration
    const activeEditorValue = useEditorTabStore(tabId, (s) => s.editorValue);
    const setEditorValue = useEditorTabStore(tabId, (s) => s.setEditorValue);
    const setResults = useEditorTabStore(tabId, (s) => s.setResults);
    const setExecutionTime = useEditorTabStore(tabId, (s) => s.setExecutionTime);
    const columnInfo = useEditorTabStore(tabId, (s) => s.columnInfo);
    const rowData = useEditorTabStore(tabId, (s) => s.rowData);
    const lastExecutionTimeMs = useEditorTabStore(tabId, (s) => s.lastExecutionTimeMs);
    const tableRef = useRef<TableRef>(null);

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

    const runQueryMutation = useMutation({
        mutationFn: async ({connectionId, query}: { connectionId: string; query: string }) => {
            const [cols, data] = await DBConnectionService.RunQuery(connectionId, query);
            return {cols: (cols || []) as columns[], data: (data || []) as string[][]};
        },
        onSuccess: (result) => {
            setResults(result.cols, result.data);
            tableRef.current?.scrollToTop();
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Error executing query:", err);
            if (message.includes("connection not found")) {
                localStorage.removeItem("activeConnectionId");
                setTimeout(() => {
                    window.location.href = "/connections.html";
                }, 2000);
            }
        },
    });

    function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
        // here is the editor instance
        // you can store it in `useRef` for further usage
        editorRef.current = editor;
        // Also store it globally for access from sidebar
        editor.updateOptions({
            minimap: {enabled: false},
        });
    }

    async function handleRunQuery() {
        if (!editorRef.current) {
            return;
        }
        const query = editorRef.current.getValue();
        const connectionId = localStorage.getItem("activeConnectionId");

        // clear previous error state
        runQueryMutation.reset();

        if (!connectionId) {
            // If no active connection, redirect to connections page
            window.location.href = "/connections.html";
            return;
        }
        const start = performance.now();
        try {
            await runQueryMutation.mutateAsync({connectionId, query});
            const end = performance.now();
            setExecutionTime?.(Math.round(end - start));
        } catch (e) {
            // in case of error, we can still record elapsed time if desired
            const end = performance.now();
            setExecutionTime?.(Math.round(end - start));
            throw e;
        }
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
                            disabled={runQueryMutation.isPending}
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
                <div className={"h-full flex flex-col max-h-full overflow-hidden"}>
                    <div className="relative grow shrink overflow-hidden">
                        <Table columnInfo={columnInfo} rowData={rowData} ref={tableRef}/>
                        {(runQueryMutation.isPending || runQueryMutation.isError) && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20">
                                {/* Error banner on top of overlay if present */}
                                {runQueryMutation.isError && (
                                    <div className="absolute top-0 left-0 right-0">
                                        <div
                                            className="m-4 rounded border border-red-300 bg-red-50 text-red-700 px-4 py-2 shadow">
                                            Error: {runQueryMutation.error instanceof Error ? runQueryMutation.error.message : String(runQueryMutation.error)}
                                        </div>
                                    </div>
                                )}
                                {/* Center loading indicator */}
                                {runQueryMutation.isPending && (
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
                    <div
                        className="h-5 w-full bg-background/40 border-t border-border text-xs text-muted-foreground flex items-center px-2 justify-between">
                        <div>
                            {typeof rowData?.length === 'number' ? `${rowData.length} row${rowData.length === 1 ? '' : 's'}` : ''}
                        </div>
                        <div>
                            {lastExecutionTimeMs != null ? `${lastExecutionTimeMs} ms` : ''}
                        </div>
                    </div>
                </div>
            </ResizablePanel>

        </ResizablePanelGroup>
    );
}