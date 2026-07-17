"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { Smartphone } from "lucide-react";

export default function DevicesPage() {
  return (
    <GenericEntityPage
      title="Shared Devices"
      entityType="DEVICE"
      icon={Smartphone}
      statsConfig={[]}
    />
  );
}
