// State held by each individual tab
import { columns } from "../../../bindings/changeme/internal.ts";
import { createStore } from "zustand/vanilla";

type EditorTabState = {
  type: "editor";
  id: string;
  title: string;
  // Editor content for this tab
  editorValue: string;
  // Query results for this tab
  columnInfo: columns[];
  rowData: string[][];
  // Last execution time in milliseconds for the latest run
  lastExecutionTimeMs: number | null;
  // Actions for this tab
};

type EditorTabActions = {
  setEditorValue: (value: string) => void;
  setResults: (columns: columns[], rows: string[][]) => void;
  setExecutionTime: (ms: number | null) => void;
  reset: () => void;
};

export type EditorStore = EditorTabState & EditorTabActions;

const createEditorTabStore = (
  init?: Partial<Omit<EditorStore, "id" | "title">> & {
    id?: string;
    title?: string;
  },
) => {
  const id = init?.id ?? crypto.randomUUID();
  const title = init?.title ?? "SQL Query";

  return createStore<EditorStore>()((set) => ({
    type: "editor",
    id,
    title,
    editorValue: init?.editorValue ?? "-- Enter your SQL query here",
    columnInfo: init?.columnInfo ?? [],
    rowData: init?.rowData ?? [],
    lastExecutionTimeMs: init?.lastExecutionTimeMs ?? null,
    setEditorValue: (value) => set({ editorValue: value }),
    setResults: (columns, rows) =>
      set({ columnInfo: columns ?? [], rowData: rows ?? [] }),
    setExecutionTime: (ms) => set({ lastExecutionTimeMs: ms }),
    reset: () =>
      set({
        editorValue: "-- Enter your SQL query here",
        columnInfo: [],
        rowData: [],
        lastExecutionTimeMs: null,
      }),
  }));
};

export type EditorStoreAPI = ReturnType<typeof createEditorTabStore>;

export const createEditorStoreFactory = (
  editorStores: Map<string, ReturnType<typeof createEditorTabStore>>,
) => {
  return (
    counterStoreKey: string,
    initData?: Partial<Omit<EditorStore, "id" | "title">> & {
      id?: string;
      title?: string;
    },
  ) => {
    if (!editorStores.has(counterStoreKey)) {
      editorStores.set(counterStoreKey, createEditorTabStore(initData));
    }
    return editorStores.get(counterStoreKey)!;
  };
};
