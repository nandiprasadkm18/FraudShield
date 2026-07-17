"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function BanksPage() {
  return (
    <GenericEntityPage
      title="Bank Accounts"
      entityType="BANK_ACCOUNT"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
