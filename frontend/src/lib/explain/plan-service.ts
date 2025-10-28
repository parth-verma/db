import _ from "lodash";
import { EstimateDirection, NodeProp } from "./enums";
import type { IPlan, IPlanContent, IPlanStats, PlanNode } from "./interfaces";

export class PlanService {
  private nodeId = 0;
  private flat: PlanNode[] = [];

  public createPlan(
    planName: string,
    planContent: IPlanContent,
    planQuery: string,
  ): IPlan {
    // remove any extra white spaces in the middle of query
    planQuery = planQuery.replace(/(\S)(?!$)(\s{2,})/gm, "$1 ");

    const plan: IPlan = {
      id: NodeProp.PEV_PLAN_TAG + new Date().getTime().toString(),
      name: planName || "plan created on " + new Date().toDateString(),
      createdOn: new Date(),
      content: planContent,
      query: planQuery,
      planStats: {} as IPlanStats,
      ctes: [],
      isAnalyze: _.has(planContent.Plan, NodeProp.ACTUAL_ROWS),
    };

    this.nodeId = 1;
    this.processNode(planContent.Plan, plan);

    // @ts-expect-error - fix types someday
    this.flat = this.flat.concat(this.recurse([plan.content.Plan]).flat());
    _.each(plan.ctes, (cte) => {
      // @ts-expect-error - fix types someday
      this.flat = this.flat.concat(this.recurse([cte]).flat());
    });

    this.calculateMaximums(plan);

    const content = plan.content;
    const planStats: IPlanStats = {
      executionTime:
        (content["Execution Time"] as number) ||
        (content["Total Runtime"] as number) ||
        NaN,
      planningTime: (content["Planning Time"] as number) || NaN,
      maxRows: content.maxRows || NaN,
      maxCost: content.maxCost || NaN,
      maxDuration: content.maxDuration || NaN,
      maxEstimateFactor: content.maxEstimateFactor || NaN,
    };
    plan.planStats = planStats;

    return plan;
  }

  private recurse(nodes: PlanNode[]): Array<[PlanNode, unknown]> {
    return _.map(nodes, (node) => [
      node,
      this.recurse(node[NodeProp.PLANS] || []),
    ]);
  }

  public isCTE(node: PlanNode) {
    return (
      node[NodeProp.PARENT_RELATIONSHIP] === "InitPlan" &&
      _.startsWith(node[NodeProp.SUBPLAN_NAME], "CTE")
    );
  }

  private processNode(node: PlanNode, plan: IPlan) {
    node.nodeId = this.nodeId++;
    this.calculatePlannerEstimate(node);

    _.each(node[NodeProp.PLANS] || [], (child) => {
      // Disseminate workers planned info to parallel nodes
      if (
        !this.isCTE(child) &&
        child[NodeProp.PARENT_RELATIONSHIP] !== "InitPlan" &&
        child[NodeProp.PARENT_RELATIONSHIP] !== "SubPlan"
      ) {
        child[NodeProp.WORKERS_PLANNED_BY_GATHER] =
          node[NodeProp.WORKERS_PLANNED] ||
          node[NodeProp.WORKERS_PLANNED_BY_GATHER];
        child[NodeProp.WORKERS_LAUNCHED_BY_GATHER] =
          node[NodeProp.WORKERS_LAUNCHED] ||
          node[NodeProp.WORKERS_LAUNCHED_BY_GATHER];
      }
      if (this.isCTE(child)) {
        plan.ctes.push(child);
      }
      this.processNode(child, plan);
    });

    _.remove(node[NodeProp.PLANS] || [], (child) => this.isCTE(child));

    this.calculateActuals(node);
    this.calculateExclusives(node);
  }

  private calculateActuals(node: PlanNode) {
    if (!_.isUndefined(node[NodeProp.ACTUAL_TOTAL_TIME])) {
      const workers = (node[NodeProp.WORKERS_PLANNED_BY_GATHER] || 0) + 1;
      node[NodeProp.ACTUAL_TOTAL_TIME] =
        ((node[NodeProp.ACTUAL_TOTAL_TIME] as number) *
          (node[NodeProp.ACTUAL_LOOPS] as number)) /
        workers;
      node[NodeProp.ACTUAL_STARTUP_TIME] =
        ((node[NodeProp.ACTUAL_STARTUP_TIME] as number) *
          (node[NodeProp.ACTUAL_LOOPS] as number)) /
        workers;
      node[NodeProp.EXCLUSIVE_DURATION] = node[NodeProp.ACTUAL_TOTAL_TIME];

      const duration =
        (node[NodeProp.EXCLUSIVE_DURATION] as number) -
        this.childrenDuration(node, 0);
      node[NodeProp.EXCLUSIVE_DURATION] = duration > 0 ? duration : 0;
    }

    if (!_.isUndefined(node[NodeProp.TOTAL_COST])) {
      node[NodeProp.EXCLUSIVE_COST] = node[NodeProp.TOTAL_COST];
    }

    _.each(node[NodeProp.PLANS] || [], (subPlan) => {
      if (subPlan[NodeProp.TOTAL_COST]) {
        node[NodeProp.EXCLUSIVE_COST] =
          (node[NodeProp.EXCLUSIVE_COST] as number) -
          (subPlan[NodeProp.TOTAL_COST] as number);
      }
    });

    if ((node[NodeProp.EXCLUSIVE_COST] as number) < 0) {
      node[NodeProp.EXCLUSIVE_COST] = 0;
    }

    _.each(
      [
        "ACTUAL_ROWS",
        "PLAN_ROWS",
        "ROWS_REMOVED_BY_FILTER",
        "ROWS_REMOVED_BY_JOIN_FILTER",
        "ROWS_REMOVED_BY_INDEX_RECHECK",
      ],
      (prop: keyof typeof NodeProp) => {
        if (!_.isUndefined(node[NodeProp[prop]])) {
          const revisedProp = (prop + "_REVISED") as keyof typeof NodeProp;
          const loops = node[NodeProp.ACTUAL_LOOPS] || 1;
          const revised = (node[NodeProp[prop]] as number) * loops;
          node[NodeProp[revisedProp] as unknown as keyof PlanNode] = revised;
        }
      },
    );
  }

  private childrenDuration(node: PlanNode, duration: number) {
    _.each(node[NodeProp.PLANS] || [], (child) => {
      if (
        child[NodeProp.PARENT_RELATIONSHIP] !== "InitPlan" ||
        (child[NodeProp.PARENT_RELATIONSHIP] === "InitPlan" &&
          node[NodeProp.NODE_TYPE] === "Result")
      ) {
        duration += (child[NodeProp.ACTUAL_TOTAL_TIME] as number) || 0;
      }
    });
    return duration;
  }

  private calculatePlannerEstimate(node: PlanNode) {
    if (
      node[NodeProp.ACTUAL_ROWS] !== undefined &&
      node[NodeProp.PLAN_ROWS] !== undefined
    ) {
      node[NodeProp.PLANNER_ESTIMATE_FACTOR] =
        (node[NodeProp.ACTUAL_ROWS] as number) /
        (node[NodeProp.PLAN_ROWS] as number);
      node[NodeProp.PLANNER_ESTIMATE_DIRECTION] = EstimateDirection.none;

      if (
        (node[NodeProp.ACTUAL_ROWS] as number) >
        (node[NodeProp.PLAN_ROWS] as number)
      ) {
        node[NodeProp.PLANNER_ESTIMATE_DIRECTION] = EstimateDirection.under;
      }
      if (
        (node[NodeProp.ACTUAL_ROWS] as number) <
        (node[NodeProp.PLAN_ROWS] as number)
      ) {
        node[NodeProp.PLANNER_ESTIMATE_DIRECTION] = EstimateDirection.over;
        node[NodeProp.PLANNER_ESTIMATE_FACTOR] =
          (node[NodeProp.PLAN_ROWS] as number) /
          (node[NodeProp.ACTUAL_ROWS] as number);
      }
    }
  }

  private calculateExclusives(node: PlanNode) {
    const properties: Array<keyof typeof NodeProp> = [
      "SHARED_HIT_BLOCKS",
      "SHARED_READ_BLOCKS",
      "SHARED_DIRTIED_BLOCKS",
      "SHARED_WRITTEN_BLOCKS",
      "TEMP_READ_BLOCKS",
      "TEMP_WRITTEN_BLOCKS",
      "LOCAL_HIT_BLOCKS",
      "LOCAL_READ_BLOCKS",
      "LOCAL_DIRTIED_BLOCKS",
      "LOCAL_WRITTEN_BLOCKS",
    ];

    _.each(properties, (property) => {
      const sum = Number(
        _.sumBy(
          _.filter(
            node[NodeProp.PLANS] || [],
            (child: PlanNode) => !child[NodeProp.SUBPLAN_NAME],
          ),
          (child: PlanNode) => {
            return (child[NodeProp[property]] as number) || 0;
          },
        ).toFixed(3),
      );
      const exclusivePropertyString = ("EXCLUSIVE_" +
        property) as keyof typeof NodeProp;
      const nodeProp = NodeProp[
        exclusivePropertyString
      ] as unknown as keyof PlanNode;
      node[nodeProp] = Number(
        ((node[NodeProp[property]] as number) - sum).toFixed(3),
      );
    });
  }

  private calculateMaximums(plan: IPlan) {
    const largest = _.maxBy(this.flat, NodeProp.ACTUAL_ROWS_REVISED);
    if (largest) {
      plan.content.maxRows = largest[NodeProp.ACTUAL_ROWS_REVISED] as number;
    }

    const costliest = _.maxBy(this.flat, NodeProp.EXCLUSIVE_COST);
    if (costliest) {
      plan.content.maxCost = costliest[NodeProp.EXCLUSIVE_COST] as number;
    }

    const totalCostliest = _.maxBy(this.flat, NodeProp.TOTAL_COST);
    if (totalCostliest) {
      plan.content.maxTotalCost = totalCostliest[NodeProp.TOTAL_COST] as number;
    }

    const slowest = _.maxBy(this.flat, NodeProp.EXCLUSIVE_DURATION);
    if (slowest) {
      plan.content.maxDuration = slowest[NodeProp.EXCLUSIVE_DURATION] as number;
    }

    const highestEstimateFactor = _.max(
      _.map(this.flat, (node) => {
        const f = node[NodeProp.PLANNER_ESTIMATE_FACTOR];
        if (f !== Infinity) {
          return f;
        }
      }),
    ) as number;
    plan.content.maxEstimateFactor = highestEstimateFactor * 2 || 1;
  }

  public fromSource(source: string): IPlanContent {
    try {
      const data = JSON.parse(source);
      return this.getPlanContent(data);
    } catch {
      throw new Error("Failed to parse plan JSON");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getPlanContent(value: any): IPlanContent {
    if (Array.isArray(value)) {
      value = value[0];
    }
    if (!value.Plan) {
      throw new Error("Invalid plan");
    }
    return value;
  }
}
