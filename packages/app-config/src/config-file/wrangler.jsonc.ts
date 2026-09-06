import { cwd } from "process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import {
  applyEdits,
  modify as modifyJsonc,
  parse as parseJsonc,
} from "jsonc-parser";
import { dirname } from "path";

const src = `${cwd()}/wrangler.jsonc`;
const gen = `${cwd()}/.generated/wrangler.jsonc`;

export type WranglerConfig = {
  name: string;
  vars?: Record<string, string>;
  env?: Record<string, Partial<WranglerConfig>>;
  services?: { binding: string; service: string }[];
  [key: string]: unknown;
};

function exists(): boolean {
  return existsSync(src);
}
function read(): WranglerConfig {
  const content = readFileSync(src, "utf-8");
  const parsed = parseJsonc(content) as WranglerConfig;
  return parsed;
}
function patch(original: string, values: Partial<WranglerConfig>): string {
  const originalModel = parseJsonc(original) as WranglerConfig;

  const formattingOptions = {
    insertSpaces: true,
    tabSize: 2,
  };
  const { name, vars, env, services, ...rest } = values;

  // patch name, vars, and env first
  if (name !== undefined) {
    const nextEdits = modifyJsonc(original, ["name"], name, {
      formattingOptions,
    });
    original = applyEdits(original, nextEdits);
  }
  if (vars !== undefined) {
    for (const [key, value] of Object.entries(vars)) {
      const nextEdits = modifyJsonc(original, ["vars", key], value, {
        formattingOptions,
      });
      original = applyEdits(original, nextEdits);
    }
  }
  if (env !== undefined) {
    for (const [key, value] of Object.entries(env)) {
      const nextEdits = modifyJsonc(original, ["env", key], value, {
        formattingOptions,
      });
      original = applyEdits(original, nextEdits);
    }
  }

  // patch services next
  const serviceBindingMap = (services ?? []).reduce(
    (acc, { binding, service }) => {
      acc[binding] = service;
      return acc;
    },
    {} as Record<string, string>,
  );
  for (const service of originalModel.services ?? []) {
    if (Object.keys(serviceBindingMap).includes(service.binding)) {
      // override
      const nextEdits = modifyJsonc(
        original,
        ["services", originalModel.services!.indexOf(service), "service"],
        serviceBindingMap[service.binding],
        {
          formattingOptions,
        },
      );
      original = applyEdits(original, nextEdits);
      delete serviceBindingMap[service.binding];
    }
  }
  // the rest
  let length_count = (originalModel.services ?? []).length;
  for (const [binding, service] of Object.entries(serviceBindingMap)) {
    const nextEdits = modifyJsonc(
      original,
      ["services", length_count, "binding"],
      binding,
      {
        formattingOptions,
      },
    );
    original = applyEdits(original, nextEdits);

    const nextEditsService = modifyJsonc(
      original,
      ["services", length_count, "service"],
      service,
      {
        formattingOptions,
      },
    );
    original = applyEdits(original, nextEditsService);
    length_count++;
  }

  // patch the rest of the fields last
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue;
    const nextEdits = modifyJsonc(original, [key], value, {
      formattingOptions,
    });
    original = applyEdits(original, nextEdits);
  }

  return original;
}
function modify(values: Partial<WranglerConfig>) {
  const originalContent = readFileSync(src, "utf-8");
  const patchedContent = patch(originalContent, values);
  writeFileSync(src, patchedContent, "utf-8");
}
function generate(values: WranglerConfig) {
  if (!existsSync(dirname(gen))) {
    mkdirSync(dirname(gen), { recursive: true });
  }
  const content = JSON.stringify(values, null, 2) + "\n";
  writeFileSync(gen, content, "utf-8");
}

export const testExport = {
  patch,
};
export const wranglerJsonc = {
  exists,
  read,
  modify,
  generate,
};
