// utils/sanitizeCss.ts
import * as csstree from 'css-tree';

export function sanitizeCss(rawCss: string): string {
  try {
    const ast = csstree.parse(rawCss);
    const safeCss = csstree.generate(ast);

    // Optional: filter out global selectors (like body, html)
    // or block unsafe properties like `behavior`, `url()`, etc.

    return safeCss;
  } catch {
    return ''; // fallback on parse failure
  }
}
