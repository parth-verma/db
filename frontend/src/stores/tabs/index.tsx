import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  createEditorStoreFactory,
  EditorStore,
  EditorStoreAPI,
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

export const EditorStoresProvider = ({ children }) => {
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

  const openTab = useCallbackStable(
    (
      initData: Omit<Parameters<typeof getOrCreateCounterStoreByKey>[1], "id">,
    ) => {
      const id = crypto.randomUUID();
      getOrCreateCounterStoreByKey(id, { ...initData, id });
      setOrder((s) => [...s, id]);
      setActive(id);
    },
  );

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

export function useEditorTabStore<U>(
  id: string,
  selector: (state: EditorStore) => U,
) {
  const { stores } = useContext(EditorStoresContext);
  const store = stores.get(id);

  if (!store) {
    throw new Error(
      "useEditorTabStore must be used within EditorStoresProvider",
    );
  }

  const getOrCreateCounterStoreByKey = useCallbackStable((id: string) =>
    createEditorStoreFactory(stores)(id),
  );

  return useStore(getOrCreateCounterStoreByKey(id), selector);
}
