import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

export type LeftPanelContextValue = {
  leftPanelRef: React.RefObject<ImperativePanelHandle | null>;
  collapseLeftPanel: () => void;
  expandLeftPanel: () => void;
  toggleLeftPanel: () => void;
  isLeftPanelCollapsed: () => boolean;
};

const LeftPanelContext = createContext<LeftPanelContextValue | null>(null);

export function useLeftPanel() {
  const ctx = useContext(LeftPanelContext);
  if (!ctx)
    throw new Error("useLeftPanel must be used within LeftPanelProvider");
  return ctx;
}

export function LeftPanelProvider({ children }: { children: React.ReactNode }) {
  const leftPanelRef = useRef<ImperativePanelHandle | null>(null);

  const isLeftPanelCollapsed = useCallback(() => {
    const collapsed = leftPanelRef.current?.isCollapsed();
    return !!collapsed;
  }, []);

  const collapseLeftPanel = useCallback(() => {
    leftPanelRef.current?.collapse?.();
  }, []);

  const expandLeftPanel = useCallback(() => {
    leftPanelRef.current?.expand?.();
  }, []);

  const toggleLeftPanel = useCallback(() => {
    if (leftPanelRef.current?.isCollapsed()) {
      leftPanelRef.current?.expand?.();
    } else {
      leftPanelRef.current?.collapse?.();
    }
  }, []);

  const value = useMemo<LeftPanelContextValue>(
    () => ({
      leftPanelRef,
      collapseLeftPanel,
      expandLeftPanel,
      toggleLeftPanel,
      isLeftPanelCollapsed,
    }),
    [collapseLeftPanel, expandLeftPanel, toggleLeftPanel, isLeftPanelCollapsed],
  );

  return (
    <LeftPanelContext.Provider value={value}>
      {children}
    </LeftPanelContext.Provider>
  );
}
