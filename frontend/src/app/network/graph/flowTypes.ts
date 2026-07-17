import FraudNode from "@/components/FraudNode";
import LiveEdge from "@/components/LiveEdge";

export const initialNodeTypes: Record<string, any> = {
  default: FraudNode,
  custom: FraudNode,
  entity: FraudNode,
  phone: FraudNode,
  victim: FraudNode,
  bank: FraudNode,
  upi: FraudNode,
  email: FraudNode,
  telegram: FraudNode,
  crypto: FraudNode,
  website: FraudNode,
  kingpin: FraudNode,
  cluster: FraudNode,
};

export const initialEdgeTypes = {
  default: LiveEdge,
  custom: LiveEdge,
  liveEdge: LiveEdge,
};
