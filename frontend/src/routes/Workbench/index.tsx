import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/app-sidebar.tsx";
import {Tabs, TabsContent, TabsList} from "@/components/ui/tabs.tsx";
import {Button} from "@/components/ui/button.tsx";
import {PlusIcon} from "lucide-react";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup,} from "@/components/ui/resizable.tsx";
import {useLeftPanel} from "@/contexts/left-panel-context";

import {useTabActions, useTab} from "@/stores/tabs";
import {EditorTab} from "@/routes/Workbench/editor-tab.tsx";
import {ScrollbarCustom} from "@/components/scroll-bar";
import {lazy, Suspense} from "react";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import ErrorBoundary from "@/components/ErrorBoundary";

const QueryTab = lazy(() => import("@/routes/Workbench/Editors/query-tab.tsx").then(m => ({default: m.QueryTab})));
const ExplainTab = lazy(() => import("@/routes/Workbench/Editors/explain-tab.tsx").then(m => ({default: m.ExplainTab})));

function WorkbenchTabContent({ id }: { id: string }) {
    const tab = useTab(id);
    if (tab?.type === "explain") {
        return <ExplainTab tabId={id}/>;
    }
    return <QueryTab tabId={id}/>;
}

export default function Index() {
    // Tabs header state
    const {tabsList: order, active, openTab, setActiveTab} = useTabActions();
    const {leftPanelRef} = useLeftPanel();

    return (
        <ResizablePanelGroup direction="horizontal" className={"flex-1"}>
            <ResizablePanel
                // @ts-expect-error - Figure out the correct types for
                ref={leftPanelRef}
                minSize={20}
                collapsedSize={0}
                defaultSize={20}
                collapsible
                className={"min-h-full"}
            >
                <SidebarProvider>
                    <AppSidebar/>
                </SidebarProvider>
            </ResizablePanel>
            <ResizableHandle/>
            <ResizablePanel minSize={30} defaultSize={80}>
                <Tabs
                    value={active ?? undefined}
                    onValueChange={setActiveTab}
                    className="w-full h-full bg-muted"
                >
                    <TabsList
                        className={"w-full rounded-none justify-between pr-1 border-b pt-0"}
                    >
                        <ScrollbarCustom>
                            <div className="flex items-center">
                                {order.map((id) => (
                                    <EditorTab tabId={id} key={id}/>
                                ))}
                            </div>
                        </ScrollbarCustom>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                                openTab({ type: "editor" });
                            }}
                            aria-label="New tab"
                        >
                            <PlusIcon className="h-4 w-4"/>
                        </Button>
                    </TabsList>
                    {order.map((id) => (
                        <TabsContent key={id} className={"text-foreground"} value={id}>
                            <ErrorBoundary resetKeys={[id]}>
                                <Suspense fallback={<div className={"w-full h-full flex items-center justify-center"}>
                                    <Spinner variant={'infinite'} size={40}/>
                                </div>}>
                                    <WorkbenchTabContent key={id} id={id}/>
                                </Suspense>
                            </ErrorBoundary>
                        </TabsContent>
                    ))}
                </Tabs>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

