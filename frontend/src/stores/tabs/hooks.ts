import { useMemo } from "react";
import { useTabsStore } from "./store";
import { TabType, TabTypeMap } from "./types";

// ============================================================================
// Main Hook: useTabState
// ============================================================================

export function useTabState<T extends TabType>(tabId: string, type: T) {
  const tab = useTabsStore(
    (state) => state.tabs.get(tabId) as TabTypeMap[T] | undefined,
  );
  const updateTab = useTabsStore((state) => state.updateTab);

  // Create setters for each field
  const setters = useMemo(() => {
    if (!tab) {
      return {} as Record<string, (value: unknown) => void>;
    }

    const result: Record<string, (value: unknown) => void> = {};
    for (const key of Object.keys(tab)) {
      if (key === "id" || key === "type") continue;

      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      result[`set${capitalizedKey}`] = (value: unknown) => {
        updateTab(tabId, { [key]: value } as Partial<TabTypeMap[T]>);
      };
    }
    return result;
  }, [tab, tabId, updateTab]);

  return {
    ...tab,
    ...setters,
  } as TabTypeMap[T] & {
    [K in keyof TabTypeMap[T] as K extends "id" | "type"
      ? never
      : `set${Capitalize<string & K>}`]: (value: TabTypeMap[T][K]) => void;
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

export function useEditorTab(tabId: string) {
  return useTabState(tabId, "editor");
}

export function useExplainTab(tabId: string) {
  return useTabState(tabId, "explain");
}

// ============================================================================
// General Tab Hooks
// ============================================================================

export function useTab(tabId: string) {
  return useTabsStore((state) => state.tabs.get(tabId));
}

export function useTabsList() {
  return useTabsStore((state) =>
    state.order.map((id) => state.tabs.get(id)).filter(Boolean),
  );
}

export function useActiveTab() {
  const activeTabId = useTabsStore((state) => state.activeTabId);
  return useTabsStore((state) =>
    activeTabId ? state.tabs.get(activeTabId) : null,
  );
}

// ============================================================================
// Action Hooks
// ============================================================================

export function useTabActions() {
  const openTab = useTabsStore((state) => state.openTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const order = useTabsStore((state) => state.order);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  return {
    openTab,
    closeTab,
    setActiveTab,
    tabsList: order,
    active: activeTabId,
  };
}
