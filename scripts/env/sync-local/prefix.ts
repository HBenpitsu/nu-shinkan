export function addVITEPrefix(
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key.startsWith("VITE_") ? key : `VITE_${key}`,
      value,
    ]),
  );
}
