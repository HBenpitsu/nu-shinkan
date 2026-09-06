export function parseCommand(body) {
  const words = body.trim().split(/\s+/);
  return words[0] === "/preview" ? words.slice(1) : undefined;
}
