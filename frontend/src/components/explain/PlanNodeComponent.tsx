import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { PlanNode } from "@/lib/explain/interfaces";
import { NodeProp, HighlightType } from "@/lib/explain/enums";
import {
  formatDuration,
  formatRows,
  formatCost,
  numberToColorHsl,
} from "@/lib/explain/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLayoutContext } from "./LayoutContext";
import useResizeObserver from "use-resize-observer";

export interface PlanNodeData extends Record<string, unknown> {
  node: PlanNode;
  highlightType: HighlightType;
  maxDuration?: number;
  maxRows?: number;
  maxCost?: number;
}

export const PlanNodeComponent = memo((props: NodeProps) => {
  const data = props.data as PlanNodeData;
  const { node, highlightType, maxDuration, maxRows, maxCost } = data;
  const [isOpen, setIsOpen] = useState(false);
  const componentRef = useRef<HTMLDivElement>();
  const { registerNodeDimensions } = useLayoutContext();
  const { ref } = useResizeObserver<HTMLDivElement>({
    onResize: ({ width, height }) => {
      registerNodeDimensions(props.id, {
        width: width || 0,
        height: height || 0,
      });
    },
  });

  useEffect(() => {
    if (!componentRef.current) return;
    registerNodeDimensions(props.id, {
      width: componentRef.current.offsetWidth,
      height: componentRef.current.offsetHeight,
    });
  }, [highlightType, JSON.stringify(node), isOpen]);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
  };

  // Calculate node name
  const getNodeName = () => {
    let name = node[NodeProp.PARALLEL_AWARE] ? "Parallel " : "";
    name += node[NodeProp.PARTIAL_MODE]
      ? node[NodeProp.PARTIAL_MODE] + " "
      : "";
    name += node[NodeProp.NODE_TYPE];
    if (
      node[NodeProp.SCAN_DIRECTION] &&
      node[NodeProp.SCAN_DIRECTION] !== "Forward"
    ) {
      name += " " + node[NodeProp.SCAN_DIRECTION];
    }
    return name;
  };

  // Calculate highlight bar
  const getHighlightInfo = () => {
    let value: number | undefined;
    let barWidth = 0;
    let displayValue = "";
    let barColor = "";

    switch (highlightType) {
      case HighlightType.DURATION:
        value = node[NodeProp.EXCLUSIVE_DURATION] as number | undefined;
        if (value !== undefined && maxDuration) {
          barWidth = Math.round((value / maxDuration) * 100);
          displayValue = formatDuration(value);
          barColor = numberToColorHsl(barWidth);
        }
        break;
      case HighlightType.ROWS:
        value = node[NodeProp.ACTUAL_ROWS_REVISED] as number | undefined;
        if (value !== undefined && maxRows) {
          barWidth = Math.round((value / maxRows) * 100) || 0;
          displayValue = formatRows(value);
          barColor = numberToColorHsl(barWidth);
        }
        break;
      case HighlightType.COST:
        value = node[NodeProp.EXCLUSIVE_COST] as number | undefined;
        if (value !== undefined && maxCost) {
          barWidth = Math.round((value / maxCost) * 100);
          displayValue = formatCost(value);
          barColor = numberToColorHsl(barWidth);
        }
        break;
    }

    return { barWidth, displayValue, barColor };
  };

  const nodeName = getNodeName();
  const { barWidth, displayValue, barColor } = getHighlightInfo();

  // Check if there's additional data to show
  const hasBufferData = !!(
    node[NodeProp.SHARED_HIT_BLOCKS] ||
    node[NodeProp.SHARED_READ_BLOCKS] ||
    node[NodeProp.LOCAL_HIT_BLOCKS] ||
    node[NodeProp.TEMP_READ_BLOCKS]
  );

  const hasWorkerData = !!(
    node[NodeProp.WORKERS] || node[NodeProp.WORKERS_PLANNED]
  );

  const hasOutputData = !!node[NodeProp.OUTPUT];

  const hasMiscData = !!(
    node[NodeProp.FILTER] ||
    node[NodeProp.HASH_CONDITION] ||
    node[NodeProp.SORT_METHOD] ||
    node[NodeProp.GROUP_KEY]
  );

  const hasDetailedInfo =
    hasBufferData || hasWorkerData || hasOutputData || hasMiscData;

  return (
    <div
      ref={ref}
      className="bg-background border-2 border-border rounded-lg shadow-lg min-w-[250px] max-w-[400px]"
    >
      <Handle type="target" position={Position.Top} className="invisible" />

      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <div
          className="p-3"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggle(!isOpen);
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-sm text-foreground flex-1">
              {nodeName}
            </h4>
            {hasDetailedInfo && (
              <CollapsibleTrigger className="ml-2 text-muted-foreground hover:text-foreground">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
            )}
          </div>

          {/* Node details */}
          <div className="text-xs space-y-1 font-mono">
            {(node[NodeProp.RELATION_NAME] || node[NodeProp.FUNCTION_NAME]) && (
              <div className="text-muted-foreground">
                <span className="text-muted-foreground/60">on </span>
                {node[NodeProp.SCHEMA] && <span>{node[NodeProp.SCHEMA]}.</span>}
                {node[NodeProp.RELATION_NAME] || node[NodeProp.FUNCTION_NAME]}
                {node[NodeProp.ALIAS] && (
                  <>
                    <span className="text-muted-foreground/60"> as </span>
                    {node[NodeProp.ALIAS]}
                  </>
                )}
              </div>
            )}

            {node[NodeProp.INDEX_NAME] && (
              <div className="text-muted-foreground">
                <span className="text-muted-foreground/60">using </span>
                {node[NodeProp.INDEX_NAME]}
              </div>
            )}

            {node[NodeProp.JOIN_TYPE] && (
              <div className="text-muted-foreground">
                {node[NodeProp.JOIN_TYPE]}
                <span className="text-muted-foreground/60"> join</span>
              </div>
            )}

            {node[NodeProp.CTE_NAME] && (
              <div className="text-muted-foreground">
                <span className="text-muted-foreground/60">CTE </span>
                {node[NodeProp.CTE_NAME]}
              </div>
            )}
          </div>

          {/* Highlight bar */}
          {highlightType !== HighlightType.NONE && displayValue && (
            <div className="mt-2">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                <span className="text-muted-foreground/60">
                  {highlightType}:{" "}
                </span>
                <span className="font-medium">{displayValue}</span>
              </div>
            </div>
          )}

          {/* Additional stats */}
          <div className="mt-2 pt-2 border-t border-border text-xs space-y-0.5">
            {node[NodeProp.ACTUAL_ROWS] !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Rows:</span>
                <span className="font-medium">
                  {formatRows(node[NodeProp.ACTUAL_ROWS_REVISED] as number)}
                </span>
              </div>
            )}
            {node[NodeProp.ACTUAL_TOTAL_TIME] !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Time:</span>
                <span className="font-medium">
                  {formatDuration(node[NodeProp.ACTUAL_TOTAL_TIME] as number)}
                </span>
              </div>
            )}
            {node[NodeProp.TOTAL_COST] !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Cost:</span>
                <span className="font-medium">
                  {formatCost(node[NodeProp.TOTAL_COST] as number)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible detailed information */}
        {hasDetailedInfo && (
          <CollapsibleContent>
            <div className="border-t border-border">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 h-8">
                  <TabsTrigger value="general" className="text-xs h-7">
                    General
                  </TabsTrigger>
                  {hasBufferData && (
                    <TabsTrigger value="buffers" className="text-xs h-7">
                      Buffers
                    </TabsTrigger>
                  )}
                  {hasOutputData && (
                    <TabsTrigger value="output" className="text-xs h-7">
                      Output
                    </TabsTrigger>
                  )}
                  {hasWorkerData && (
                    <TabsTrigger value="workers" className="text-xs h-7">
                      Workers
                    </TabsTrigger>
                  )}
                  {hasMiscData && (
                    <TabsTrigger value="misc" className="text-xs h-7">
                      Misc
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="general" className="p-3 text-xs space-y-1">
                  {node[NodeProp.STARTUP_COST] !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/60">
                        Startup Cost:
                      </span>
                      <span>
                        {formatCost(node[NodeProp.STARTUP_COST] as number)}
                      </span>
                    </div>
                  )}
                  {node[NodeProp.PLAN_ROWS] !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/60">
                        Plan Rows:
                      </span>
                      <span>
                        {formatRows(node[NodeProp.PLAN_ROWS] as number)}
                      </span>
                    </div>
                  )}
                  {node[NodeProp.PLAN_WIDTH] !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/60">
                        Plan Width:
                      </span>
                      <span>{String(node[NodeProp.PLAN_WIDTH])} bytes</span>
                    </div>
                  )}
                  {node[NodeProp.ACTUAL_LOOPS] !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/60">Loops:</span>
                      <span>{String(node[NodeProp.ACTUAL_LOOPS])}</span>
                    </div>
                  )}
                </TabsContent>

                {hasBufferData && (
                  <TabsContent
                    value="buffers"
                    className="p-3 text-xs space-y-1"
                  >
                    {node[NodeProp.SHARED_HIT_BLOCKS] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Shared Hit:
                        </span>
                        <span>{String(node[NodeProp.SHARED_HIT_BLOCKS])}</span>
                      </div>
                    )}
                    {node[NodeProp.SHARED_READ_BLOCKS] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Shared Read:
                        </span>
                        <span>{String(node[NodeProp.SHARED_READ_BLOCKS])}</span>
                      </div>
                    )}
                    {node[NodeProp.SHARED_WRITTEN_BLOCKS] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Shared Written:
                        </span>
                        <span>
                          {String(node[NodeProp.SHARED_WRITTEN_BLOCKS])}
                        </span>
                      </div>
                    )}
                    {node[NodeProp.LOCAL_HIT_BLOCKS] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Local Hit:
                        </span>
                        <span>{String(node[NodeProp.LOCAL_HIT_BLOCKS])}</span>
                      </div>
                    )}
                    {node[NodeProp.TEMP_READ_BLOCKS] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Temp Read:
                        </span>
                        <span>{String(node[NodeProp.TEMP_READ_BLOCKS])}</span>
                      </div>
                    )}
                  </TabsContent>
                )}

                {hasOutputData && (
                  <TabsContent value="output" className="p-3 text-xs">
                    <div className="font-mono text-muted-foreground break-words">
                      {Array.isArray(node[NodeProp.OUTPUT])
                        ? (node[NodeProp.OUTPUT] as string[]).join(", ")
                        : String(node[NodeProp.OUTPUT])}
                    </div>
                  </TabsContent>
                )}

                {hasWorkerData && (
                  <TabsContent
                    value="workers"
                    className="p-3 text-xs space-y-1"
                  >
                    {node[NodeProp.WORKERS_PLANNED] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Planned:
                        </span>
                        <span>{String(node[NodeProp.WORKERS_PLANNED])}</span>
                      </div>
                    )}
                    {node[NodeProp.WORKERS_LAUNCHED] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Launched:
                        </span>
                        <span>{String(node[NodeProp.WORKERS_LAUNCHED])}</span>
                      </div>
                    )}
                  </TabsContent>
                )}

                {hasMiscData && (
                  <TabsContent value="misc" className="p-3 text-xs space-y-2">
                    {node[NodeProp.FILTER] && (
                      <div>
                        <div className="text-muted-foreground/60 mb-1">
                          Filter:
                        </div>
                        <div className="font-mono text-muted-foreground break-words bg-muted/50 p-2 rounded">
                          {String(node[NodeProp.FILTER])}
                        </div>
                      </div>
                    )}
                    {node[NodeProp.HASH_CONDITION] && (
                      <div>
                        <div className="text-muted-foreground/60 mb-1">
                          Hash Condition:
                        </div>
                        <div className="font-mono text-muted-foreground break-words bg-muted/50 p-2 rounded">
                          {String(node[NodeProp.HASH_CONDITION])}
                        </div>
                      </div>
                    )}
                    {node[NodeProp.SORT_METHOD] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Sort Method:
                        </span>
                        <span>{String(node[NodeProp.SORT_METHOD])}</span>
                      </div>
                    )}
                    {node[NodeProp.SORT_SPACE_USED] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">
                          Sort Space:
                        </span>
                        <span>{String(node[NodeProp.SORT_SPACE_USED])} kB</span>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>

      <Handle type="source" position={Position.Bottom} className="invisible" />
    </div>
  );
});

PlanNodeComponent.displayName = "PlanNodeComponent";
