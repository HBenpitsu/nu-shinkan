export function shouldProcess(
  appName: string,
  selected?: Set<string>,
): boolean {
  return !selected || selected.size === 0 || selected.has(appName);
}

export function parseDotenv(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq < 1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    result.set(key, value);
  }

  return result;
}

export function formatDotenv(values: Map<string, string>): string {
  return `${[...values.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")}\n`;
}

export function stripJsonComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

export function normalizeMainPathForGenerated(main: unknown): unknown {
  if (typeof main !== "string") {
    return main;
  }

  if (main.startsWith("./")) {
    return `.${main}`.replace(/^\.\//, "../");
  }

  if (main.startsWith("../") || main.startsWith("/")) {
    return main;
  }

  return `../${main}`;
}

export function mergeBindingArray(
  baseItems: unknown,
  overrideItems: Array<Record<string, string>> | undefined,
  key: string,
): Array<Record<string, string>> | undefined {
  const base = Array.isArray(baseItems)
    ? (baseItems as Array<Record<string, string>>)
    : [];

  if (!overrideItems || overrideItems.length === 0) {
    return base.length > 0 ? base : undefined;
  }

  const map = new Map<string, Record<string, string>>();
  for (const item of base) {
    const name = item[key];
    if (name) {
      map.set(name, item);
    }
  }

  for (const item of overrideItems) {
    const name = item[key];
    if (!name) {
      continue;
    }
    map.set(name, item);
  }

  return [...map.values()];
}
