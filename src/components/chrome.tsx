"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname && /\/g\/\d+\/read\/?$/.test(pathname)) return null;
  return <>{children}</>;
}
