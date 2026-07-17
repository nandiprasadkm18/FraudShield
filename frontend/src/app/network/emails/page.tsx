"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function EmailsPage() {
  return (
    <GenericEntityPage
      title="Email Addresses"
      entityType="EMAIL"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
