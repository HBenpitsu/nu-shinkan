import { existsSync, readFileSync } from "node:fs";

function parseJson(text, fallback) {
	if (typeof text !== "string" || !text.trim()) return fallback;
	try {
		return JSON.parse(text);
	} catch {
		return fallback;
	}
}

function readTextIfExists(path) {
	if (typeof path !== "string" || !path.trim()) return "";
	if (!existsSync(path)) return "";
	return readFileSync(path, "utf8");
}

function extractUrls(text) {
	const matches = text.match(
		/https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s"']*)?/gi,
	);
	return [...new Set(matches || [])];
}

function parseSummary(summaryText) {
	const summary = parseJson(summaryText, {});
	const tasks = Array.isArray(summary.tasks) ? summary.tasks : [];
	const byPackage = new Map();
	for (const task of tasks) {
		if (task?.task !== "deploy") continue;
		if (typeof task?.package !== "string" || !task.package) continue;
		byPackage.set(task.package, {
			exitCode:
				typeof task?.execution?.exitCode === "number"
					? task.execution.exitCode
					: undefined,
			cached: task?.cache?.status === "HIT",
		});
	}
	return {
		executionExitCode:
			typeof summary?.execution?.exitCode === "number"
				? summary.execution.exitCode
				: undefined,
		byPackage,
	};
}

function pickPackageUrl({ urls, workerName, prNumber }) {
	if (!workerName || !prNumber) return "";
	const byPreviewName = urls.find((url) =>
		url.includes(`${workerName}-preview-pr-${prNumber}`),
	);
	if (byPreviewName) return byPreviewName;
	const byWorker = urls.find((url) => url.includes(workerName));
	return byWorker || "";
}

function collectFailedSteps(stepsText) {
	const steps = parseJson(stepsText, {});
	return Object.entries(steps)
		.filter(([, value]) => value?.outcome === "failure")
		.map(([name]) => name);
}

export function buildPreviewDeployReport({
	targetsText,
	deployPackagesText,
	deployStatusText,
	summaryPath,
	logPath,
	stepsText,
	jobStatus,
	deployChannel,
	prNumber,
	isPrOpen,
	runUrl,
}) {
	const targets = parseJson(targetsText, []);
	const deployPackages = new Set(parseJson(deployPackagesText, []));
	const deployStatus = Number.parseInt(deployStatusText || "", 10);
	const summaryInfo = parseSummary(readTextIfExists(summaryPath));
	const logText = readTextIfExists(logPath);
	const allUrls = extractUrls(logText);

	const results = targets.map((target) => {
		const pkg = target?.package;
		if (typeof pkg !== "string" || !pkg)
			return { package: "(unknown)", status: "unknown", success: false };

		if (!deployPackages.has(pkg)) {
			return {
				package: pkg,
				status: "not-needed",
				success: true,
				workerName: target?.workerName,
				urls: [],
				url: "",
			};
		}

		const task = summaryInfo.byPackage.get(pkg);
		const success = task
			? task.exitCode === 0
			: Number.isInteger(deployStatus)
				? deployStatus === 0
				: summaryInfo.executionExitCode === 0;
		const url = pickPackageUrl({
			urls: allUrls,
			workerName: target?.workerName,
			prNumber,
		});
		return {
			package: pkg,
			status: success ? "deployed" : "failed",
			success,
			workerName: target?.workerName,
			cached: task?.cached === true,
			urls: url ? [url] : [],
			url,
		};
	});

	const failedSteps = collectFailedSteps(stepsText);
	const rows = results.map((result) => {
		const label =
			result.status === "deployed"
				? "deployed"
				: result.status === "not-needed"
					? "not-needed"
					: "failed";
		const urlList =
			Array.isArray(result.urls) && result.urls.length > 0
				? result.urls.join("<br>")
				: "";
		return `| ${result.package} | ${label} | ${urlList} |`;
	});

	const detail =
		isPrOpen === "false"
			? "PR is not open. Deployment skipped."
			: results.length > 0
				? ""
				: "No packages deployed.";

	const body = [
		`### ${deployChannel || "preview"}: ${jobStatus || "unknown"}`,
		detail,
		`[Actions run](${runUrl})`,
		failedSteps.length ? `Failed steps: ${failedSteps.join(", ")}` : "",
		"| Package | Result | URL |",
		"| --- | --- | --- |",
		...rows,
	]
		.filter(Boolean)
		.join("\n");

	return {
		results,
		body,
		hasFailure:
			failedSteps.length > 0 || results.some((result) => result.success === false),
	};
}

export async function notifyPreviewDeployReport({ core, github, context, report }) {
	await core.summary.addRaw(report.body).write();
	const issueNumber = Number.parseInt(process.env.PR_NUMBER || "", 10);
	if (Number.isInteger(issueNumber) && issueNumber > 0) {
		try {
			await github.rest.issues.createComment({
				...context.repo,
				issue_number: issueNumber,
				body: report.body,
			});
		} catch (error) {
			const message =
				error && typeof error.message === "string"
					? error.message
					: "Unknown error";
			core.warning(`Unable to notify PR: ${message}`);
		}
	}
	if (report.hasFailure) {
		core.setFailed("One or more deploy tasks failed");
	}
}
