"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { clientLogout } from "@/lib/actions/portal-session";

export function ClientLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await clientLogout();
      router.push("/portal/expired");
    } catch {
      // Even if something fails, redirect
      router.push("/portal/expired");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="gap-1.5 text-xs h-8"
    >
      <IconLogout className="size-3.5" />
      <span className="hidden sm:inline">
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </span>
    </Button>
  );
}
