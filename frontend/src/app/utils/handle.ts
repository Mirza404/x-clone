export function toHandle(name: string | null | undefined): string {
  if (!name) return '';
  return `@${name.toLowerCase().replace(/\s+/g, '')}`;
}
