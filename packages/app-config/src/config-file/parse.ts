// 設定ローダー間で共有する入力検証。特定の設定ファイルには依存しない。
export type Variables = Record<string, string>;

/** 省略されたフィールドは空のmappingとして扱い、配列やnullは拒否する。 */
export function asRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: expected mapping`);
  return value as Record<string, unknown>;
}

/** YAMLのscalarを環境変数用の文字列へ揃える。nullによる削除指示は呼び出し側で扱う。 */
export function asVariables(value: unknown, label: string): Variables {
  return Object.fromEntries(
    Object.entries(asRecord(value, label)).map(([key, val]) => [
      key,
      asVariable(val, `${label}.${key}`),
    ]),
  );
}

/** mapping内のnullを保持し、それ以外のscalarを環境変数用の文字列へ揃える。 */
export function asNullableVariables(
  value: unknown,
  label: string,
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(asRecord(value, label)).map(([key, val]) => [
      key,
      asNullableVariable(val, `${label}.${key}`),
    ]),
  );
}

/** local設定の削除指示はnullのまま保持し、それ以外は環境変数へ変換する。 */
export function asNullableVariable(
  value: unknown,
  label: string,
): string | null {
  return value === null ? null : asVariable(value, label);
}

/** 単一のscalarを検証して文字列へ変換する。labelはエラー箇所を表す。 */
export function asVariable(value: unknown, label: string): string {
  if (!["string", "number", "boolean"].includes(typeof value))
    throw new Error(`${label}: expected scalar`);
  return String(value);
}
