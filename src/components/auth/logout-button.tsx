"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { PremiumButton } from "@/components/premium/premium-button";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <PremiumButton
      type="button"
      tone="ghost"
      className={className}
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        await signOut({ callbackUrl: "/courses" });
      }}
    >
      {isPending ? (
        <>
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Выходим...
        </>
      ) : (
        <>
          <LogOut className="mr-2 size-4" />
          Выйти
        </>
      )}
    </PremiumButton>
  );
}
