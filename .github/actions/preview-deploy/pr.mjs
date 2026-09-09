// Evaluate the fetched PR immediately before the corresponding side effect.
export function isValidPreview(pr, { repository, headSha, baseSha }) {
  return Boolean(
    headSha &&
    pr.state === "open" &&
    pr.head?.repo?.full_name === repository &&
    pr.head?.sha === headSha &&
    (!baseSha || pr.base?.sha === baseSha),
  );
}

export function shouldCleanup(pr, manual) {
  return manual || pr.state === "closed";
}
