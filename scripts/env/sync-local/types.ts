export type SyncMode = "check" | "apply";

export type SyncOptions = {
  mode: SyncMode;
  apps?: Set<string>;
};

export type SyncChange = {
  filePath: string;
  keys: string[];
};
