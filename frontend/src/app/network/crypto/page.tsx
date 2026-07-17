"use client";

import { GenericEntityPage } from "@/components/GenericEntityPage";
import { UserX } from "lucide-react";

export default function CryptoPage() {
  return (
    <GenericEntityPage
      title="Crypto Wallets"
      entityType="CRYPTO_WALLET"
      icon={UserX}
      statsConfig={[]}
    />
  );
}
