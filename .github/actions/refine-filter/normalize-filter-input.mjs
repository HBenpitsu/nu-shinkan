// Empty text means all packages; an explicit [] must remain an empty selection.
export function normalizeFilterInput(filter) {
  if (typeof filter !== "string")
    throw new Error("Expected a string of filters");
  const text = filter.trim();
  if (!text) return [];
  let values;
  if (text.startsWith("[")) {
    // A Turbo diff selector such as [base...head] is not a JSON array.
    try {
      values = JSON.parse(text);
    } catch (error) {
      if (!/^\[[^\s"'\[\],]+\]$/.test(text)) throw error;
    }
  }
  if (values === undefined) values = text.split(/[\s,]+/);
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== "string")
  )
    throw new Error("Expected an array of string filters");
  return [
    ...new Set(
      values
        .map((value) => value.replace(/^--filter(?:=|\s+|$)/, "").trim())
        .filter(Boolean),
    ),
  ];
}
