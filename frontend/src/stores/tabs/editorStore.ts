// Generic Tabs Store: state defined by Zod, setters auto-generated
import { createStore } from "zustand/vanilla";
import { z } from "zod";

// Utility types to auto-generate setter names and function signatures
type CapitalizeFirst<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

type ExcludedKeys = "type" | "id";

type SetterActions<S> = {
  [K in keyof S as K extends string
    ? K extends ExcludedKeys
      ? never
      : `set${CapitalizeFirst<K>}`
    : never]: (value: S[K & keyof S]) => void;
};

type CommonActions = { reset: () => void };

// Editor tab state schema (state only)
const EditorStateSchema = z.object({
  type: z.literal("editor"),
  id: z.string(),
  title: z.string().optional().default("SQL Query"),
  editorValue: z.string().default("-- Enter your SQL query here"),
  queryResult: z.any().nullable().default(null),
  lastExecutionTimeMs: z.number().nullable().default(null),
});

// Explain tab state schema (state only)
const ExplainStateSchema = z.object({
  type: z.literal("explain"),
  id: z.string(),
  title: z.string().optional().default("Explain Query"),
  explainQuery: z.string().default(""),
  explainResult: z.string().default(""),
});

// Inferred state types
type EditorState = z.infer<typeof EditorStateSchema>;
type ExplainState = z.infer<typeof ExplainStateSchema>;

// Full tab types with auto-generated setters and reset
export type EditorTab = EditorState & SetterActions<EditorState> & CommonActions & {
  setExecutionTime: (ms: number | null) => void;
};
export type ExplainTab = ExplainState & SetterActions<ExplainState> & CommonActions;

export type TabState = EditorTab | ExplainTab;

// Zod schemas for discriminated init types (input shapes)
const BaseInitSchema = z.object({
  title: z.string().optional(),
});

export const EditorTabEditorInitSchema = BaseInitSchema.extend({
  type: z.literal("editor"),
  id: z.string(),
  editorValue: z.string().optional(),
  queryResult: z.any().nullable().optional(),
  lastExecutionTimeMs: z.number().nullable().optional(),
});

export const EditorTabExplainInitSchema = BaseInitSchema.extend({
  type: z.literal("explain"),
  id: z.string(),
  explainQuery: z.string().optional(),
  explainResult: z.string().optional(),
});

export const EditorTabInitSchema = z.discriminatedUnion("type", [
  EditorTabEditorInitSchema,
  EditorTabExplainInitSchema,
]);

export type EditorTabEditorInit = z.input<typeof EditorTabEditorInitSchema>;
export type EditorTabExplainInit = z.input<typeof EditorTabExplainInitSchema>;
export type EditorTabDiscriminatedInit = z.infer<typeof EditorTabInitSchema>;

export type EditorStoreAPI = ReturnType<typeof createTabStore>;

// Helper to generate per-field setters
function buildSetters<S extends object>(
  keys: Array<keyof S>,
  set: (partial: Partial<S>, replace?: boolean) => void,
) {
  const setters: Record<string, (value: unknown) => void> = {};
  for (const key of keys) {
    if (key === "type" || key === "id") continue;
    const method = `set${String(key).charAt(0).toUpperCase()}${String(key).slice(1)}`;
    setters[method] = (value: unknown) => set({ [key]: value } as Partial<S>);
  }
  return setters as SetterActions<S>;
}

function createTabStore(init: EditorTabDiscriminatedInit) {
  if (!init?.id) {
    throw new Error("createTabStore requires an id in init");
  }
  return createStore<TabState>((set, get) => {
    if (init.type === "editor") {
      // Parse with defaults applied where missing
      const parsed = EditorStateSchema.parse({ ...init });
      const stateKeys = Object.keys(parsed) as Array<keyof EditorState>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setters = buildSetters<EditorState>(stateKeys, set as any);
      const editorSpecific = {
        setExecutionTime: (ms: number | null) => set({ lastExecutionTimeMs: ms } as Partial<EditorState>),
      } satisfies Pick<EditorTab, "setExecutionTime">;
      const reset = () => {
        // Reset to defaults, preserving id and type
        const base = EditorStateSchema.parse({ type: init.type, id: parsed.id });
        set(base as unknown as Partial<EditorTab>);
      };
      return { ...parsed, ...setters, ...editorSpecific, reset } as EditorTab;
    } else {
      const parsed = ExplainStateSchema.parse({ ...init });
      const stateKeys = Object.keys(parsed) as Array<keyof ExplainState>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setters = buildSetters<ExplainState>(stateKeys, set as any);
      const reset = () => {
        const base = ExplainStateSchema.parse({ type: init.type, id: parsed.id });
        set(base as unknown as Partial<ExplainTab>);
      };
      return { ...parsed, ...setters, reset } as ExplainTab;
    }
  });
}

export const createEditorStoreFactory = (
  editorStores: Map<string, ReturnType<typeof createTabStore>>,
) => {
  return <K extends EditorTabDiscriminatedInit["type"]>(
    initData: Extract<EditorTabDiscriminatedInit, { type: K }> & { id: string },
  ) => {
    if (!editorStores.has(initData.id)) {
      const store = createTabStore(initData);
      editorStores.set(initData.id, store);
    }
    const store = editorStores.get(initData.id)!;
    if (store.getState().type !== initData.type) {
      throw new Error(
        `Cannot create a store for a tab with type ${initData.type} when the store already exists with type ${store.getState().type}`,
      );
    }
    return store;
  };
};
