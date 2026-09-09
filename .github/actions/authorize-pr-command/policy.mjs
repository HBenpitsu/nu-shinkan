/** Identify the author of the configured PR comment command. */
export function commandAuthor(eventName, payload, command) {
  if (
    typeof command !== "string" ||
    !/^\/[a-z][a-z0-9-]*$/.test(command) ||
    eventName !== "issue_comment" ||
    payload?.action !== "created" ||
    !payload.issue?.pull_request ||
    !Number.isSafeInteger(payload.issue.number) ||
    payload.issue.number <= 0 ||
    typeof payload.comment?.body !== "string" ||
    payload.comment.body.trim() !== command ||
    !payload.comment.user?.login
  ) {
    throw new Error(
      "Expected the configured command without arguments on a pull request",
    );
  }
  return payload.comment.user.login;
}

export function requireWritePermission(permission) {
  // GitHub maps Maintain/custom write-equivalent roles to the write base role.
  if (!["write", "maintain", "admin"].includes(permission)) {
    throw new Error("Command author requires repository write permission");
  }
}
