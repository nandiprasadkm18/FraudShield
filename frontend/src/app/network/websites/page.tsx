"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function WebsitesPage() {
  return (
    <GenericEntityPage
      title="Websites"
      entityType="WEBSITE"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
