import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useMediaQuery } from "use-custom-hooks";
import {clsx} from "clsx";

function Root(){
    const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    return (
        <>
            <div className={clsx("flex flex-col min-h-svh min-w-svw bg-background", isDarkMode && "dark" )}>
                <div className="h-8 bg-sidebar">
                </div>
                <div className={"overflow-hidden flex-1 min-h-0 min-w-svw flex flex-col"}>
                    <Outlet />
                </div>
            </div>
            <TanStackRouterDevtools />
        </>
    )
}

export const Route = createRootRoute({
    component: Root
})