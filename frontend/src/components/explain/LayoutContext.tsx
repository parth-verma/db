import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Node, Edge } from "@xyflow/react";
import { PlanNodeData } from "./PlanNodeComponent";
import { IPlan, PlanNode } from "@/lib/explain/interfaces";
import { NodeProp, HighlightType } from "@/lib/explain/enums";
import { useCallbackStable } from "use-callback-stable";

interface NodeDimensions {
  width: number;
  height: number;
}

interface LayoutContextType {
  registerNodeDimensions: (nodeId: string, dimensions: NodeDimensions) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within LayoutProvider");
  }
  return context;
};

const EDGE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // violet
  "#84cc16", // lime
  "#6366f1", // indigo
];

interface LayoutProviderProps {
  plan: IPlan;
  highlightType: HighlightType;
  setNodes: (nodes: Node<PlanNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export function LayoutProvider({
  children,
  plan,
  highlightType,
  setNodes,
  setEdges,
}: React.PropsWithChildren<LayoutProviderProps>) {
  const [nodeDimensions, setNodeDimensions] = useState<
    Map<string, NodeDimensions>
  >(new Map());
  const edgeColorMap = useRef<Map<string, string>>(new Map());
  const nodeEdgeColors = useRef<Map<number, Set<string>>>(new Map());
  const requestRef = useRef<ReturnType<typeof requestAnimationFrame>>();

  const getEdgeColor = (sourceId: number, targetId: number): string => {
    const edgeKey = `${sourceId}-${targetId}`;

    // Return existing color if already assigned
    if (edgeColorMap.current.has(edgeKey)) {
      return edgeColorMap.current.get(edgeKey)!;
    }

    // Get colors already used at source and target nodes
    const sourceColors =
      nodeEdgeColors.current.get(sourceId) || new Set<string>();
    const targetColors =
      nodeEdgeColors.current.get(targetId) || new Set<string>();

    // Find available colors not used at either node
    const availableColors = EDGE_COLORS.filter(
      (color) => !sourceColors.has(color) && !targetColors.has(color),
    );

    // Select color (prefer available, fallback to random)
    const selectedColor =
      availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : EDGE_COLORS[Math.floor(Math.random() * EDGE_COLORS.length)];

    // Store the color assignment
    edgeColorMap.current.set(edgeKey, selectedColor);

    // Track colors at both nodes
    if (!nodeEdgeColors.current.has(sourceId)) {
      nodeEdgeColors.current.set(sourceId, new Set());
    }
    if (!nodeEdgeColors.current.has(targetId)) {
      nodeEdgeColors.current.set(targetId, new Set());
    }
    nodeEdgeColors.current.get(sourceId)!.add(selectedColor);
    nodeEdgeColors.current.get(targetId)!.add(selectedColor);

    return selectedColor;
  };

  const clearLayout = useCallback(() => {
    setNodeDimensions(new Map());
    edgeColorMap.current.clear();
    nodeEdgeColors.current.clear();
  }, []);

  const buildLayout = useCallbackStable(() => {
    cancelAnimationFrame(requestRef.current!);
    const nodes: Node<PlanNodeData>[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<number, { x: number; y: number }>();

    // Calculate positions using a simple tree layout
    const levelNodes = new Map<number, PlanNode[]>();

    const calculatePositions = (node: PlanNode, level: number) => {
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(node);

      const children = node[NodeProp.PLANS] || [];
      children.forEach((child) => {
        calculatePositions(child, level + 1);
      });
    };

    // First pass: organize nodes by level
    calculatePositions(plan.content.Plan, 0);
    let currentY = 0;

    // Second pass: assign positions with proper spacing
    levelNodes.forEach((nodesAtLevel, level) => {
      const levelNodeCount = nodesAtLevel.length;
      const nodeDimensionsAtCurrentLevel = nodesAtLevel.map(
        (node) =>
          nodeDimensions.get(`node-${node.nodeId}`) || { width: 0, height: 0 },
      );
      const totalWidth = nodeDimensionsAtCurrentLevel.reduce(
        (acc, { width }) => acc + width,
        0,
      );
      const spacing = 50; // Horizontal spacing between nodes
      const verticalSpacing = 75; // Vertical spacing between levels
      const startX = -((levelNodeCount - 1) * spacing + totalWidth) / 2;
      let currentX = startX;
      const maxHeight = nodeDimensionsAtCurrentLevel.reduce(
        (acc, { height }) => Math.max(acc, height),
        0,
      );

      nodesAtLevel.forEach((node, index) => {
        const x = currentX;
        currentX += nodeDimensionsAtCurrentLevel[index].width + spacing;
        // const nodeHeight = nodeDimensionsAtCurrentLevel[index].height;

        const y = currentY;
        nodePositions.set(node.nodeId, { x, y });
      });
      currentY += maxHeight + verticalSpacing;
    });

    const addNodeAndEdges = (node: PlanNode, parentId?: number) => {
      const position = nodePositions.get(node.nodeId) || { x: 0, y: 0 };

      nodes.push({
        id: `node-${node.nodeId}`,
        type: "planNode",
        position,
        data: {
          node,
          highlightType,
          maxDuration: plan.planStats.maxDuration,
          maxRows: plan.planStats.maxRows,
          maxCost: plan.planStats.maxCost,
        },
      });

      if (parentId !== undefined) {
        // Calculate edge width based on rows
        const actualRows = node[NodeProp.ACTUAL_ROWS_REVISED] as
          | number
          | undefined;
        const maxRows = plan.planStats.maxRows;

        let strokeWidth = 2;
        if (actualRows !== undefined && maxRows && maxRows > 0) {
          const ratio = actualRows / maxRows;
          strokeWidth = Math.max(1, Math.min(8, 1 + ratio * 7));
        }

        // Get stable color for this edge
        const edgeColor = getEdgeColor(parentId, node.nodeId);

        edges.push({
          id: `edge-${parentId}-${node.nodeId}`,
          source: `node-${parentId}`,
          target: `node-${node.nodeId}`,
          type: "default",
          animated: false,
          style: {
            stroke: edgeColor,
            strokeWidth,
          },
        });
      }

      // Process children
      const children = node[NodeProp.PLANS] || [];
      children.forEach((child) => {
        addNodeAndEdges(child, node.nodeId);
      });
    };

    // Build nodes and edges
    addNodeAndEdges(plan.content.Plan);

    // Handle CTEs
    plan.ctes.forEach((cte, index) => {
      const cteX = -500 + index * 400;
      const cteY = -200;
      nodePositions.set(cte.nodeId, { x: cteX, y: cteY });

      // Recalculate CTE children positions
      calculatePositions(cte, 0);

      addNodeAndEdges(cte);
    });

    setNodes(nodes);
    setEdges(edges);
  });

  const registerNodeDimensions = useCallback(
    (nodeId: string, dimensions: NodeDimensions) => {
      const current = nodeDimensions.get(nodeId);
      if (
        current &&
        current.width === dimensions.width &&
        current.height === dimensions.height
      ) {
        return;
      }
      setNodeDimensions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, dimensions);
        return next;
      });
      requestRef.current = requestAnimationFrame(() => {
        buildLayout();
      });
    },
    [],
  );

  const value: LayoutContextType = {
    registerNodeDimensions,
  };

  useEffect(() => {
    clearLayout();
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(() => {
      buildLayout();
    });
  }, [plan]);

  useEffect(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(() => {
      buildLayout();
    });
  }, [highlightType]);

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}
