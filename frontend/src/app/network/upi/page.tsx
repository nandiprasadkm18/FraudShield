"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function UPIPage() {
  return (
    <GenericEntityPage
      title="UPI Accounts"
      entityType="UPI_ID"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
