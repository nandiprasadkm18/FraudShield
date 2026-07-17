"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function TelegramPage() {
  return (
    <GenericEntityPage
      title="Telegram IDs"
      entityType="TELEGRAM_ID"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
