import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createEditorStoreFactory,
  EditorStoreAPI,
  TabState,
  EditorTabDiscriminatedInit,
} from "./editorStore.ts";
import { useCallbackStable } from "use-callback-stable";
import { useStore } from "zustand/react";

const EditorStoresContext = createContext({
  stores: new Map<string, EditorStoreAPI>(),
  order: [] as Array<string>,
  active: null as string | null,
  setOrder: (() => {}) as Dispatch<SetStateAction<string[]>>,
  setActive: (() => {}) as Dispatch<SetStateAction<string | null>>,
});

export const EditorStoresProvider = ({ children }: PropsWithChildren) => {
  const [stores] = useState(() => new Map<string, EditorStoreAPI>());

  const [order, setOrder] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);

  return (
    <EditorStoresContext.Provider
      value={{
        stores,
        order,
        active,
        setActive,
        setOrder,
      }}
    >
      {children}
    </EditorStoresContext.Provider>
  );
};

export const useEditorStores = () => {
  const { stores, setOrder, order, setActive, active } =
    useContext(EditorStoresContext);
  const getOrCreateCounterStoreByKey = useMemo(
    () => createEditorStoreFactory(stores),
    [stores],
  );

  const openTab = <K extends EditorTabDiscriminatedInit['type']>(initData: Omit<Extract<EditorTabDiscriminatedInit, { type: K }>, 'id'>) => {
    const id: string = crypto.randomUUID();
    // Forward to factory while preserving discriminant by casting to the full discriminated init
    getOrCreateCounterStoreByKey({
      ...initData,
      id,
    } as EditorTabDiscriminatedInit);
    setOrder((s) => [...s, id]);
    setActive(id);
  };


  const closeTab = useCallbackStable((id: string) => {
    setOrder((s) => s.filter((i) => i !== id));
    if (active === id) {
      const index = order.indexOf(id);
      setActive(order[index - 1] || order[index + 1] || order[0]);
    }
    stores.delete(id);
  });

  const setActiveTab = useCallbackStable((id: string) => {
    setActive(id);
  });

  return {
    order,
    openTab,
    closeTab,
    setActiveTab,
    active,
  };
};

function useTabStore<U>(
  id: string,
  type: TabState['type'],
  selector: (state: TabState) => U,
) {
  const { stores } = useContext(EditorStoresContext);
  const store = stores.get(id);

  if (!store) {
    throw new Error(
      "useEditorTabStore must be used within EditorStoresProvider",
    );
  }

  // Do not attempt to create or mutate the store type here; simply use the existing store.
  return useStore(store, selector);
}

export function useEditorTabStore<U>(
  id: string,
  selector: (state: Extract<TabState, { type: 'editor' }>) => U,
) {
  return useTabStore(id, "editor", selector as unknown as (state: TabState) => U);
}

export function useExplainTabStore<U>(
  id: string,
  selector: (state: Extract<TabState, { type: 'explain' }>) => U,
) {
  return useTabStore(id, "explain", selector as unknown as (state: TabState) => U);
}

// Read from any tab state (union) without narrowing by type
export function useAnyTabStore<U>(
  id: string,
  selector: (state: TabState) => U,
) {
  const { stores } = useContext(EditorStoresContext);
  const store = stores.get(id);
  if (!store) {
    throw new Error(
      "useAnyTabStore must be used within EditorStoresProvider",
    );
  }
  return useStore(store, selector);
}