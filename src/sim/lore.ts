/** Fills {placeholders} in a lore template. Unknown placeholders are left as-is. */
export function formatLore(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
