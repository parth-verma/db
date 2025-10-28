import { useTabState } from "@/stores/tabs";
import { useMemo, useRef } from "react";
import { DBConnectionService } from "@/main";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.tsx";
import { Editor, loader } from "@monaco-editor/react";
import { Button } from "@/components/ui/button.tsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as monaco from "monaco-editor";
import { DBConnection } from "@/main/utils";

// Initialize monaco similarly as QueryTab
loader.config({ monaco });
loader.init();

export function ExplainTab({ tabId }: { tabId: string }) {
  const explainTab = useTabState(tabId, "explain");
  const { explainQuery, setExplainQuery, explainResult, setExplainResult } =
    explainTab;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  // figure out active connection type
  const activeConnectionId = useMemo(() => {
    try {
      return localStorage.getItem("activeConnectionId");
    } catch {
      return null;
    }
  }, []);

  const { data: connections = [] } = useQuery<DBConnection[]>({
    queryKey: ["connections"],
    queryFn: () => DBConnectionService.GetConnections(),
    retry: false,
  });

  const activeConnection = useMemo(() => {
    return connections.find((c) => c.id === activeConnectionId);
  }, [connections, activeConnectionId]);

  const runExplainMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnectionId) {
        throw new Error("No active connection");
      }
      const sql = buildExplainSQL(
        activeConnection?.type ?? "",
        editorRef.current?.getValue() ?? explainQuery ?? "",
      );
      const [_, rows] = await DBConnectionService.RunQuery(
        activeConnectionId,
        sql,
      );
      // rows is string[][]; gather into single string lines
      const resultStr = rows.map((r) => r.join("\t")).join("\n");
      return resultStr;
    },
    onSuccess: (res) => {
      setExplainResult?.(res);
    },
  });

  function buildExplainSQL(dbType: string, query: string): string {
    const trimmed = query?.trim();
    if (!trimmed) return "";
    if (dbType === "postgres") {
      return `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${trimmed}`;
    }
    // default mysql
    // MySQL EXPLAIN ANALYZE returns a textual plan with timing
    return `EXPLAIN ANALYZE ${trimmed}`;
  }

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel
        minSize={20}
        defaultSize={30}
        collapsible
        collapsedSize={0}
      >
        <div className="relative">
          <Editor
            language={"sql"}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateOptions({ minimap: { enabled: false } });
            }}
            theme={"vs-dark"}
            height="40vh"
            value={explainQuery}
            onChange={(v) => setExplainQuery?.(v ?? "")}
            defaultLanguage="sql"
          />
          <div className="absolute top-2 right-2 flex gap-3 items-center">
            <Button
              onClick={() => runExplainMutation.mutate()}
              disabled={runExplainMutation.isPending || !explainQuery?.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Run Explain
            </Button>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={70}
        collapsible
        collapsedSize={0}
      >
        <div className="h-full w-full p-2 overflow-auto">
          {runExplainMutation.isPending ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Running EXPLAIN...
            </div>
          ) : explainResult ? (
            <Editor
              language={"json"}
              theme={"vs-dark"}
              height="100%"
              value={formatExplainOutput(explainResult)}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          ) : (
            <div className="text-muted-foreground">No explain output yet.</div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function formatExplainOutput(s: string): string {
  // If it's valid JSON, pretty print; else return as is
  try {
    const parsed = JSON.parse(s);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return s;
  }
}

export default ExplainTab;
