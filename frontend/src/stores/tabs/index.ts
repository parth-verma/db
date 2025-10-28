// ============================================================================
// Tabs Store - Clean API
// ============================================================================

// Types
export type {
  Tab,
  TabType,
  TabInit,
  EditorTab,
  ExplainTab,
  EditorTabInit,
  ExplainTabInit,
  TabTypeMap,
} from "./types";

// Store (rarely needed directly)
export { useTabsStore } from "./store";

// Hooks - Primary API
export {
  useTabState,
  useEditorTab,
  useExplainTab,
  useTab,
  useTabsList,
  useActiveTab,
  useTabActions,
} from "./hooks";

// ============================================================================
// Usage Examples:
// ============================================================================

/*

// Open a new tab
const { openTab, closeTab, setActiveTab, tabsList, active } = useTabActions();
const tabId = openTab({ type: "editor", editorValue: "SELECT * FROM users;" });

// Get and set tab state with type safety
const editorTab = useTabState(tabId, "editor");
console.log(editorTab.editorValue); // "SELECT * FROM users;"
editorTab.setEditorValue("SELECT * FROM orders;");
editorTab.setQueryResult({ rows: [], columns: [] });

// Convenience hooks
const editorTab2 = useEditorTab(tabId); // same as useTabState(tabId, "editor")

// Close tab
closeTab(tabId);

// Get active tab
const activeTab = useActiveTab();

// Get all tabs
const allTabs = useTabsList();

*/
