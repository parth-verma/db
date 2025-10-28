import { useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./explain-styles.css";
import { PlanNodeComponent, PlanNodeData } from "./PlanNodeComponent";
import { PlanService } from "@/lib/explain/plan-service";
import { NodeProp, HighlightType } from "@/lib/explain/enums";
import { Button } from "@/components/ui/button";
import { LayoutProvider } from "./LayoutContext";

interface ExplainVisualizationProps {
  explainResult: string;
}

const nodeTypes: NodeTypes = {
  planNode: PlanNodeComponent,
};

// Inner component that uses layout context
export function ExplainVisualization({
  explainResult,
}: ExplainVisualizationProps) {
  const [nodes, setNodes] = useNodesState<Node<PlanNodeData>>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [highlightType, setHighlightType] = useState<HighlightType>(
    HighlightType.DURATION,
  );

  const plan = useMemo(() => {
    const planService = new PlanService();
    const planContent = planService.fromSource(explainResult);
    return planService.createPlan("Query Plan", planContent, "");
  }, [explainResult]);

  const handleHighlightChange = (type: HighlightType) => {
    setHighlightType(type);
  };

  if (!explainResult) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        Run EXPLAIN to see the query plan visualization
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <LayoutProvider
        plan={plan}
        highlightType={highlightType}
        setNodes={setNodes}
        setEdges={setEdges}
      >
        <div className="w-full h-full flex flex-col">
          {/* Controls */}
          <div className="flex gap-2 p-2 bg-background border-b border-border">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={
                  highlightType === HighlightType.NONE ? "default" : "outline"
                }
                onClick={() => handleHighlightChange(HighlightType.NONE)}
              >
                None
              </Button>
              <Button
                size="sm"
                variant={
                  highlightType === HighlightType.DURATION
                    ? "default"
                    : "outline"
                }
                onClick={() => handleHighlightChange(HighlightType.DURATION)}
                disabled={!plan?.isAnalyze}
              >
                Duration
              </Button>
              <Button
                size="sm"
                variant={
                  highlightType === HighlightType.ROWS ? "default" : "outline"
                }
                onClick={() => handleHighlightChange(HighlightType.ROWS)}
                disabled={!plan?.content.Plan[NodeProp.ACTUAL_ROWS]}
              >
                Rows
              </Button>
              <Button
                size="sm"
                variant={
                  highlightType === HighlightType.COST ? "default" : "outline"
                }
                onClick={() => handleHighlightChange(HighlightType.COST)}
              >
                Cost
              </Button>
            </div>

            {plan && (
              <div className="ml-auto flex gap-4 text-xs text-muted-foreground items-center">
                {plan.planStats.executionTime && (
                  <div>
                    <span className="text-muted-foreground/60">
                      Execution:{" "}
                    </span>
                    <span className="font-medium">
                      {plan.planStats.executionTime.toFixed(2)} ms
                    </span>
                  </div>
                )}
                {plan.planStats.planningTime && (
                  <div>
                    <span className="text-muted-foreground/60">Planning: </span>
                    <span className="font-medium">
                      {plan.planStats.planningTime.toFixed(2)} ms
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* React Flow */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              fitView
              minZoom={0.1}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      </LayoutProvider>
    </ReactFlowProvider>
  );
}
