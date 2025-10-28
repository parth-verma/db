import { create } from "zustand";
import { Tab, TabInit, TabSchemas, TabType, TabTypeMap } from "./types";

// ============================================================================
// Store State
// ============================================================================

interface TabsState {
  tabs: Map<string, Tab>;
  order: string[];
  activeTabId: string | null;
}

interface TabsActions {
  openTab: <T extends TabType>(init: Extract<TabInit, { type: T }>) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: <T extends TabType>(
    id: string,
    updates: Partial<TabTypeMap[T]>,
  ) => void;
}

export type TabsStore = TabsState & TabsActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: new Map(),
  order: [],
  activeTabId: null,

  openTab: (init) => {
    const id = crypto.randomUUID();
    const schema = TabSchemas[init.type];

    // Parse with defaults applied
    const tab = schema.parse({ ...init, id }) as Tab;

    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(id, tab);

      return {
        tabs: newTabs,
        order: [...state.order, id],
        activeTabId: id,
      };
    });

    return id;
  },

  closeTab: (id) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(id);

      const newOrder = state.order.filter((tabId) => tabId !== id);

      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
        const index = state.order.indexOf(id);
        newActiveTabId = newOrder[index - 1] || newOrder[index] || null;
      }

      return {
        tabs: newTabs,
        order: newOrder,
        activeTabId: newActiveTabId,
      };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  updateTab: (id, updates) => {
    set((state) => {
      const tab = state.tabs.get(id);
      if (!tab) return state;

      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, ...updates } as Tab);

      return { tabs: newTabs };
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectTabsList = (state: TabsStore) =>
  state.order
    .map((id) => state.tabs.get(id))
    .filter((tab): tab is Tab => tab !== undefined);

export const selectActiveTab = (state: TabsStore) =>
  state.activeTabId ? state.tabs.get(state.activeTabId) : null;

export const selectTab = (id: string) => (state: TabsStore) =>
  state.tabs.get(id);
