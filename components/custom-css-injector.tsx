// components/CustomCssInjector.tsx
"use client";

import { useEffect } from "react";

export function CustomCssInjector({ css }: { css: string }) {
  useEffect(() => {
    if (!css) return;

    const style = document.createElement("style");
    style.setAttribute("data-user-css", "true");
    style.innerHTML = css;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [css]);

  return null;
}
