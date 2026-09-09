/** GitHub owns repository policy; no actor or App bypass can override this gate. */
export function checkMergeable(pr) {
  if (pr?.state !== "OPEN" || pr.isDraft !== false) {
    throw new Error("Pull request must be open and ready for review");
  }
  // A ready-to-queue PR is not eligible for a direct merge. Do not skip queues.
  if (pr.isMergeQueueEnabled !== false) {
    throw new Error(
      "Direct fast-forward merge requires a branch without a merge queue",
    );
  }
  // These are GitHub's explicitly mergeable states. UNSTABLE can include
  // optional failing checks; required policy failures are GitHub's BLOCKED.
  if (!["CLEAN", "HAS_HOOKS", "UNSTABLE"].includes(pr.mergeStateStatus)) {
    throw new Error("GitHub has not established ordinary merge eligibility");
  }
  if (
    typeof pr.headRefOid !== "string" ||
    !/^[0-9a-f]{40}$/.test(pr.headRefOid) ||
    typeof pr.baseRefName !== "string" ||
    !pr.baseRefName
  ) {
    throw new Error("GitHub did not return a valid merge target");
  }
  return { head_sha: pr.headRefOid, base_ref: pr.baseRefName };
}
