export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? (value as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
}
