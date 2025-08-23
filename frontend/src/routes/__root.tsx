import {createRootRoute, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'
import {useMediaQuery} from "use-custom-hooks";
import {clsx} from "clsx";
import {PanelLeftIcon, PanelRightIcon} from "lucide-react";
import {Button} from "@/components/ui/button"

function Root() {
    const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    return (
        <>
            <div className={clsx("flex flex-col min-h-svh min-w-svw max-h-svh max-w-svw overflow-hidden bg-background", isDarkMode && "dark")}>
                <div className="h-8 bg-sidebar">
                    <div className="flex h-full items-center justify-end px-3 gap-2">
                        <Button variant="secondary" size="icon" className="size-4">
                            <PanelLeftIcon/>
                        </Button>
                        <Button variant="secondary" size="icon" className="size-4">
                            <PanelRightIcon/>
                        </Button>
                    </div>
                </div>
                <div className={"overflow-hidden flex-1 min-h-0 min-w-svw flex flex-col"}>
                    <Outlet/>
                </div>
            </div>
            <TanStackRouterDevtools/>
        </>
    )
}

export const Route = createRootRoute({
    component: Root
})