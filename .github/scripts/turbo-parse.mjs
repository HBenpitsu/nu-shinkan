export function packages(value) {
  const items = value?.packages?.items;
  if (!Array.isArray(items)) throw Error("Invalid turbo ls output");
  return items
    .map((item) => {
      if (
        !item ||
        typeof item.name !== "string" ||
        typeof item.path !== "string"
      )
        throw Error("Invalid Turbo package");
      return { package: item.name, path: item.path };
    })
    .sort((a, b) => a.package.localeCompare(b.package));
}
