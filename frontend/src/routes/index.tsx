import { createFileRoute } from '@tanstack/react-router'
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/app-sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {XIcon} from "lucide-react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

import {Editor, loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
// @ts-expect-error - Not sure how to fix these errors
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import {useRef} from "react";

self.MonacoEnvironment = {
    getWorker(_, label) {
        return new editorWorker();
    },
};

loader.config({ monaco });

loader.init()

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

    function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
        // here is the editor instance
        // you can store it in `useRef` for further usage
        editorRef.current = editor;
        editor.updateOptions({
            minimap: { enabled: false}
        })
    }
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Tabs defaultValue="account" className="w-full h-full bg-muted">
                    <TabsList className={"w-full rounded-none"}>
                        <TabsTrigger className={"justify-between max-w-[150px]"} value="account">Account <div className={"justify-self-end"}><XIcon/></div></TabsTrigger>
                        <TabsTrigger className={"justify-between max-w-[150px]"} value="password">Password<div><XIcon/></div></TabsTrigger>
                    </TabsList>
                    <TabsContent className={"text-foreground"} value="account"><ResizablePanelGroup direction="vertical">
                        <ResizablePanel minSize={20} defaultSize={20} ><Editor language={'sql'} onMount={handleEditorDidMount} theme={'vs-dark'} height="90vh" defaultValue="// some comment" defaultLanguage="javascript" /></ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel minSize={20} defaultSize={80}>Two</ResizablePanel>
                    </ResizablePanelGroup></TabsContent>
                    <TabsContent className={"text-foreground"} value="password">Change your password here.</TabsContent>
                </Tabs>
            </SidebarInset>
        </SidebarProvider>
)
}