"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

interface ClerkClientProviderProps {
  children: ReactNode;
}

export const ClerkClientProvider = ({ children }: ClerkClientProviderProps) => {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined,
      }}
    >
      {children}
    </ClerkProvider>
  );
};
