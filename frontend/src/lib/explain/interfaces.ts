import { EstimateDirection, NodeProp } from "./enums";

export interface IPlanContent {
  Plan: PlanNode;
  maxRows?: number;
  maxCost?: number;
  maxTotalCost?: number;
  maxDuration?: number;
  "Execution Time"?: number;
  "Total Runtime"?: number;
  "Planning Time"?: number;
  "Query Text"?: string;
  maxEstimateFactor?: number;
  [k: string]: unknown;
}

export interface IPlan {
  id: string;
  name: string;
  content: IPlanContent;
  query: string;
  createdOn: Date;
  planStats: IPlanStats;
  ctes: PlanNode[];
  isAnalyze: boolean;
}

export interface IPlanStats {
  executionTime?: number;
  planningTime?: number;
  maxRows: number;
  maxCost: number;
  maxDuration: number;
  maxEstimateFactor: number;
}

// Plan Node class
export class PlanNode {
  nodeId!: number;
  [NodeProp.ACTUAL_LOOPS]?: number;
  [NodeProp.ACTUAL_ROWS]?: number;
  [NodeProp.ACTUAL_ROWS_REVISED]?: number;
  [NodeProp.ACTUAL_STARTUP_TIME]?: number;
  [NodeProp.ACTUAL_TOTAL_TIME]?: number;
  [NodeProp.EXCLUSIVE_COST]?: number;
  [NodeProp.EXCLUSIVE_DURATION]?: number;
  [NodeProp.PLANNER_ESTIMATE_DIRECTION]?: EstimateDirection;
  [NodeProp.PLANNER_ESTIMATE_FACTOR]?: number;
  [NodeProp.INDEX_NAME]?: string;
  [NodeProp.NODE_TYPE]!: string;
  [NodeProp.PARALLEL_AWARE]?: boolean;
  [NodeProp.PLANS]?: PlanNode[];
  [NodeProp.PLAN_ROWS]?: number;
  [NodeProp.PLAN_ROWS_REVISED]?: number;
  [NodeProp.SUBPLAN_NAME]?: string;
  [NodeProp.TOTAL_COST]?: number;
  [NodeProp.WORKERS_PLANNED]?: number;
  [NodeProp.WORKERS_LAUNCHED]?: number;
  [NodeProp.WORKERS_PLANNED_BY_GATHER]?: number;
  [NodeProp.WORKERS_LAUNCHED_BY_GATHER]?: number;
  [NodeProp.RELATION_NAME]?: string;
  [NodeProp.SCHEMA]?: string;
  [NodeProp.ALIAS]?: string;
  [NodeProp.GROUP_KEY]?: string | string[];
  [NodeProp.SORT_KEY]?: string[];
  [NodeProp.JOIN_TYPE]?: string;
  [NodeProp.HASH_CONDITION]?: string;
  [NodeProp.CTE_NAME]?: string;
  [NodeProp.FUNCTION_NAME]?: string;
  [NodeProp.FILTER]?: string;
  [NodeProp.PARENT_RELATIONSHIP]?: string;
  [NodeProp.SCAN_DIRECTION]?: string;
  [NodeProp.PARTIAL_MODE]?: string;
  [k: string]: unknown;

  constructor(type?: string) {
    if (!type) {
      return;
    }
    this[NodeProp.NODE_TYPE] = type;

    // Parse node type for various scan and operation patterns
    const scanAndOperationsRegex =
      /^((?:Parallel\s+)?(?:Seq|Tid.*|Bitmap\s+Heap|WorkTable|(?:Async\s+)?Foreign)\s+Scan|Update|Insert|Delete|Merge)\son\s(\S+)(?:\s+(\S+))?$/.exec(
        type,
      );

    const bitmapRegex = /^(Bitmap\s+Index\s+Scan)\son\s(\S+)$/.exec(type);
    const indexRegex =
      /^((?:Parallel\s+)?Index(?:\sOnly)?\sScan)(\sBackward)?\susing\s(\S+)\son\s(\S+)(?:\s+(\S+))?$/.exec(
        type,
      );
    const cteRegex = /^(CTE\sScan)\son\s(\S+)(?:\s+(\S+))?$/.exec(type);
    const functionRegex = /^(Function\sScan)\son\s(\S+)(?:\s+(\S+))?$/.exec(
      type,
    );
    const subqueryRegex = /^(Subquery\sScan)\son\s(.+)$/.exec(type);

    if (scanAndOperationsRegex) {
      this[NodeProp.NODE_TYPE] = scanAndOperationsRegex[1];
      this[NodeProp.RELATION_NAME] = scanAndOperationsRegex[2];
      if (scanAndOperationsRegex[3]) {
        this[NodeProp.ALIAS] = scanAndOperationsRegex[3];
      }
    } else if (bitmapRegex) {
      this[NodeProp.NODE_TYPE] = bitmapRegex[1];
      this[NodeProp.INDEX_NAME] = bitmapRegex[2];
    } else if (indexRegex) {
      this[NodeProp.NODE_TYPE] = indexRegex[1];
      this[NodeProp.INDEX_NAME] = indexRegex[3];
      this[NodeProp.SCAN_DIRECTION] = indexRegex[2] ? "Backward" : "Forward";
      this[NodeProp.RELATION_NAME] = indexRegex[4];
      if (indexRegex[5]) {
        this[NodeProp.ALIAS] = indexRegex[5];
      }
    } else if (cteRegex) {
      this[NodeProp.NODE_TYPE] = cteRegex[1];
      this[NodeProp.CTE_NAME] = cteRegex[2];
      if (cteRegex[3]) {
        this[NodeProp.ALIAS] = cteRegex[3];
      }
    } else if (functionRegex) {
      this[NodeProp.NODE_TYPE] = functionRegex[1];
      this[NodeProp.FUNCTION_NAME] = functionRegex[2];
      if (functionRegex[3]) {
        this[NodeProp.ALIAS] = functionRegex[3];
      }
    } else if (subqueryRegex) {
      this[NodeProp.NODE_TYPE] = subqueryRegex[1];
      this[NodeProp.ALIAS] = subqueryRegex[2];
    }

    // Handle parallel nodes
    const parallelRegex = /^(Parallel\s+)(.*)/.exec(
      this[NodeProp.NODE_TYPE] as string,
    );
    if (parallelRegex) {
      this[NodeProp.NODE_TYPE] = parallelRegex[2];
      this[NodeProp.PARALLEL_AWARE] = true;
    }

    // Handle join types
    const joinRegex = /(.*)\sJoin$/.exec(this[NodeProp.NODE_TYPE] as string);
    const joinModifierRegex = /(.*)\s+(Full|Left|Right|Anti)/.exec(
      this[NodeProp.NODE_TYPE] as string,
    );
    if (joinRegex) {
      this[NodeProp.NODE_TYPE] = joinRegex[1];
      if (joinModifierRegex) {
        this[NodeProp.NODE_TYPE] = joinModifierRegex[1];
        this[NodeProp.JOIN_TYPE] = joinModifierRegex[2];
      }
      this[NodeProp.NODE_TYPE] += " Join";
    }
  }
}
