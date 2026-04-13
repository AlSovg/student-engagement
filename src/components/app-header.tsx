"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  name?: string | null;
  email?: string | null;
}

export function AppHeader({ name, email }: AppHeaderProps) {
  const { data: session } = useSession();
  const displayName = name ?? email ?? session?.user?.name ?? session?.user?.email;

  return (
    <header className="border-b bg-white px-8 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{displayName}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Выйти
        </Button>
      </div>
    </header>
  );
}
