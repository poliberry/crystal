"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

interface ClerkClientProviderProps {
  children: ReactNode;
}

export const ClerkClientProvider = ({ children }: ClerkClientProviderProps) => {
  return <ClerkProvider>{children}</ClerkProvider>;
};
