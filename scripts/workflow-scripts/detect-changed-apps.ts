import {
  type OutputMap,
  detectChangedAppsWithTurbo,
  listApps,
  writeOutputs,
} from "./shared.js";

export function detectChangedApps(baseSha: string | undefined): OutputMap {
  const appNames = listApps();

  if (!baseSha || /^0+$/.test(baseSha)) {
    return {
      deploy_skipped: "false",
      changed_apps_csv: appNames.join(","),
    };
  }

  let changedApps: string[];
  try {
    changedApps = detectChangedAppsWithTurbo(baseSha, "deploy:preview");
  } catch (error) {
    console.warn(
      `Turbo-based change detection failed for BASE_SHA=${baseSha}. Falling back to deploying all apps.`,
    );
    if (error instanceof Error) {
      console.warn(error.message);
    }

    return {
      deploy_skipped: "false",
      changed_apps_csv: appNames.join(","),
    };
  }

  return {
    deploy_skipped: changedApps.length === 0 ? "true" : "false",
    changed_apps_csv: changedApps.join(","),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeOutputs(detectChangedApps(process.env.BASE_SHA?.trim()));
}
