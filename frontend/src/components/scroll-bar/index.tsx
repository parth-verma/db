import React from "react";
import {Scrollbar} from "react-scrollbars-custom";
import {clsx} from "clsx";

export function ScrollbarCustom(props: React.PropsWithChildren) {
    const [isScrollabrShown, setIsScrollbarShown] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

    return (
        <Scrollbar
            noScrollY
            disableTracksWidthCompensation
            removeTrackXWhenNotUsed
            trackXProps={{
                renderer: (props) => {
                    const {elementRef, style, ...restProps} = props;
                    return (
                        <span
                            {...restProps}
                            ref={elementRef}
                            className={clsx(
                                "TrackX absolute max-h-1 bg-transparent w-full h-1 transition-opacity",
                                {
                                    "opacity-0": !isScrollabrShown,
                                    "opacity-100": isScrollabrShown,
                                },
                            )}
                        />
                    );
                },
            }}
            wrapperProps={{
                renderer: (props) => {
                    const {elementRef, ...restProps} = props;
                    return (
                        <span
                            onMouseLeave={() => {
                                clearTimeout(timeoutRef.current);
                                timeoutRef.current = setTimeout(() => {
                                    setIsScrollbarShown(false);
                                }, 250);
                            }}
                            onMouseEnter={() => {
                                clearTimeout(timeoutRef.current);
                                timeoutRef.current = setTimeout(() => {
                                    setIsScrollbarShown(true);
                                }, 250);
                            }}
                            {...restProps}
                            ref={elementRef}
                            className="ScrollbarsCustom-Wrapper"
                        />
                    );
                },
            }}
        >
            {props.children}
        </Scrollbar>
    );
}