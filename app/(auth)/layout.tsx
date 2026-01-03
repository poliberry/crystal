import { cn } from "@/lib/utils";
import { JetBrains_Mono } from "next/font/google";
import type { PropsWithChildren } from "react";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className={cn("h-full flex items-center justify-center bg-slate-100 dark:bg-[#313338]", jetbrainsMono.className)}>
      {children}
    </div>
  );
};

export default AuthLayout;
