export type DeployEnv = "release" | "staging" | "preview";

export type ConfigStage = "local" | DeployEnv;
export type EnvironmentVariables = Record<string, string>;
export type StageVariables = Partial<Record<ConfigStage, EnvironmentVariables>>;

export type ConfigFile = {
  globals?: StageVariables;
  apps: Record<string, StageVariables>;
};

export type CliOptions = {
  env: DeployEnv;
  apps?: Set<string>;
  prNumber?: string;
};
