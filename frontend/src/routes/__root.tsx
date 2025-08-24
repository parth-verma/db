import { useMediaQuery } from '@custom-react-hooks/use-media-query';
import {clsx} from "clsx";
import {PanelLeftIcon, PanelRightIcon} from "lucide-react";
import {Button} from "@/components/ui/button"
import Index from "@/routes/index.tsx";

export default function Root() {
    const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    return (
        <>
            <div className={clsx("flex flex-col min-h-svh min-w-svw max-h-svh max-w-svw overflow-hidden bg-background", isDarkMode && "dark")}>
                <div className="h-[38px] bg-sidebar">
                    <div className="flex h-full items-center justify-end px-3 gap-2 border-b">
                        <Button variant="secondary" size="icon" className="size-4">
                            <PanelLeftIcon/>
                        </Button>
                        <Button variant="secondary" size="icon" className="size-4">
                            <PanelRightIcon/>
                        </Button>
                    </div>
                </div>
                <div className={"overflow-hidden flex-1 min-h-0 min-w-svw flex flex-col"}>
                    <Index/>
                </div>
            </div>
        </>
    )
}