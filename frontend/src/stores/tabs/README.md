# Tabs Store - Clean API

A simple, type-safe tabs management system built with Zustand.

## External API

The tabs store provides a clean external API:

- `openTab(init)` - Open a new tab and return its ID
- `closeTab(id)` - Close a tab by ID
- `setActiveTab(id)` - Set the active tab
- `tabsList` - Array of tab IDs in order
- `active` - Currently active tab ID

## Hooks

### `useTabActions()`

Access tab management actions:

```typescript
const { openTab, closeTab, setActiveTab, tabsList, active } = useTabActions();

// Open a new editor tab
const editorId = openTab({ 
  type: "editor", 
  editorValue: "SELECT * FROM users;" 
});

// Open an explain tab
const explainId = openTab({ 
  type: "explain",
  explainQuery: "EXPLAIN SELECT * FROM orders;"
});

// Close a tab
closeTab(editorId);

// Set active tab
setActiveTab(explainId);
```

### `useTabState<TabType>(tabId, type)`

Get and set state for a specific tab with full type safety:

```typescript
// In a component rendering an editor tab
const editorTab = useTabState(tabId, "editor");

// Access state
console.log(editorTab.editorValue);
console.log(editorTab.queryResult);
console.log(editorTab.lastExecutionTimeMs);

// Update state with auto-generated setters
editorTab.setEditorValue("SELECT * FROM products;");
editorTab.setQueryResult({ rows: [], columns: [] });
editorTab.setLastExecutionTimeMs(42);
```

The hook automatically generates setter functions for each field (except `id` and `type`).

### Convenience Hooks

```typescript
// Specific tab type hooks
const editorTab = useEditorTab(tabId);  // Same as useTabState(tabId, "editor")
const explainTab = useExplainTab(tabId); // Same as useTabState(tabId, "explain")

// Get any tab without type narrowing
const tab = useTab(tabId);

// Get all tabs
const allTabs = useTabsList();

// Get active tab
const activeTab = useActiveTab();
```

## Adding New Tab Types

1. Define the schema in `types.ts`:

```typescript
export const MyNewTabSchema = z.object({
  type: z.literal("mynew"),
  id: z.string(),
  title: z.string().default("My New Tab"),
  customField: z.string().default(""),
});

export type MyNewTab = z.infer<typeof MyNewTabSchema>;
export type Tab = EditorTab | ExplainTab | MyNewTab; // Add to union

export const TabSchemas = {
  editor: EditorTabSchema,
  explain: ExplainTabSchema,
  mynew: MyNewTabSchema, // Add here
} as const;
```

2. Add to `TabTypeMap`:

```typescript
export type TabTypeMap = {
  editor: EditorTab;
  explain: ExplainTab;
  mynew: MyNewTab; // Add here
};
```

3. Optionally add a convenience hook in `hooks.ts`:

```typescript
export function useMyNewTab(tabId: string) {
  return useTabState(tabId, "mynew");
}
```

That's it! The new tab type is fully integrated with type-safe state management.

## Example Usage

```typescript
// Component that manages tabs
function TabsManager() {
  const { openTab, tabsList, active } = useTabActions();

  return (
    <div>
      <button onClick={() => openTab({ type: "editor" })}>
        New Editor
      </button>
      {tabsList.map((tabId) => (
        <TabComponent key={tabId} tabId={tabId} />
      ))}
    </div>
  );
}

// Component that uses tab state
function EditorTabContent({ tabId }: { tabId: string }) {
  const tab = useTabState(tabId, "editor");

  return (
    <div>
      <input 
        value={tab.editorValue} 
        onChange={(e) => tab.setEditorValue(e.target.value)}
      />
      {tab.queryResult && (
        <div>Results: {tab.queryResult.rows.length} rows</div>
      )}
    </div>
  );
}
```

## Architecture

- **No Provider Required**: Uses Zustand, so no need to wrap your app in a provider
- **Type-Safe**: Full TypeScript support with discriminated unions
- **Auto-Generated Setters**: Setters are automatically created based on the schema
- **Schema Validation**: Zod validates state and applies defaults
- **Simple API**: Clean, intuitive interface for opening, closing, and managing tabs

