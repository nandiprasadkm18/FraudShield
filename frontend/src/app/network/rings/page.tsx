"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { Users } from "lucide-react";

export default function RingsPage() {
  return (
    <GenericEntityPage
      title="Fraud Rings"
      entityType="CLUSTER"
      icon={Users}
      statsConfig={[]}
    />
  );
}
