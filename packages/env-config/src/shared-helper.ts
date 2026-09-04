export type RecordEntry = string | number | boolean | null | object;
export function isRecord(
  value: RecordEntry,
): value is Record<string, RecordEntry> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
