import { z } from "zod";

// ============================================================================
// Tab State Schemas
// ============================================================================

export const EditorTabSchema = z.object({
  type: z.literal("editor"),
  id: z.string(),
  title: z.string().default("SQL Query"),
  editorValue: z.string().default("-- Enter your SQL query here"),
  queryResult: z.any().nullable().default(null),
  lastExecutionTimeMs: z.number().nullable().default(null),
});

export const ExplainTabSchema = z.object({
  type: z.literal("explain"),
  id: z.string(),
  title: z.string().default("Explain Query"),
  explainQuery: z.string().default(""),
  explainResult: z.string().default(""),
});

// ============================================================================
// Type Definitions
// ============================================================================

export type EditorTab = z.infer<typeof EditorTabSchema>;
export type ExplainTab = z.infer<typeof ExplainTabSchema>;

export type Tab = EditorTab | ExplainTab;
export type TabType = Tab["type"];

// Init types (what you pass to openTab - fields are optional except type)
export type EditorTabInit = Partial<Omit<EditorTab, "id" | "type">> & { type: "editor" };
export type ExplainTabInit = Partial<Omit<ExplainTab, "id" | "type">> & { type: "explain" };
export type TabInit = EditorTabInit | ExplainTabInit;

// Map tab type to full tab state
export type TabTypeMap = {
  editor: EditorTab;
  explain: ExplainTab;
};

// Schema registry for validation and defaults
export const TabSchemas = {
  editor: EditorTabSchema,
  explain: ExplainTabSchema,
} as const;

