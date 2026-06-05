#!/usr/bin/env node --experimental-strip-types

import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

type Commit = {
  hash: string;
  subject: string;
  files: string[];
};

function git(args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function ref(input: string) {
  if (input === "HEAD") return input;
  if (input.startsWith("v")) return input;
  // Support date-based tags like v20260504
  if (/^v\d{8}$/.test(input)) return input;
  return input;
}

function latestTag() {
  try {
    return git(["describe", "--tags", "--abbrev=0"]);
  } catch {
    return "";
  }
}

function commitType(subject: string) {
  if (/^(fix|bugfix)\b|fix/i.test(subject)) return "Bugfixes";
  if (/^(feat|feature)\b/i.test(subject)) return "Features";
  return "Improvements";
}

function isSourceChange(files: string[]) {
  return files.some(
    (file) =>
      file === "flake.nix" ||
      file.startsWith("modules/") ||
      file.startsWith(".github/workflows/") ||
      file === "README.md",
  );
}

function commits(from: string, to: string) {
  const range = from ? `${ref(from)}..${ref(to)}` : ref(to);
  const hashes = git(["log", "--format=%H", range]).split("\n").filter(Boolean);
  return hashes
    .map((hash): Commit => {
      const subject = git(["show", "-s", "--format=%s", hash]);
      const files = git([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        hash,
      ])
        .split("\n")
        .filter(Boolean);
      return { hash: hash.slice(0, 7), subject, files };
    })
    .filter((commit) => isSourceChange(commit.files));
}

type NixpkgsLock = {
  lastModified?: number;
  ref?: string;
  rev: string;
};

type NixpkgsUpdate = {
  from?: NixpkgsLock;
  to: NixpkgsLock;
};

function fileAt(revision: string, file: string) {
  return execFileSync("git", ["show", `${ref(revision)}:${file}`], {
    encoding: "utf8",
  });
}

function nixpkgsLock(revision: string): NixpkgsLock | undefined {
  try {
    const lock = JSON.parse(fileAt(revision, "flake.lock"));
    const rootNixpkgsInput = lock.nodes.root.inputs.nixpkgs;
    const node = lock.nodes[rootNixpkgsInput];
    return {
      lastModified: node.locked.lastModified,
      ref: node.locked.ref ?? node.original?.ref,
      rev: node.locked.rev,
    };
  } catch {
    return undefined;
  }
}

function nixpkgsUpdate(from: string, to: string): NixpkgsUpdate | undefined {
  const current = nixpkgsLock(to);
  if (!current) return undefined;

  const previous = from ? nixpkgsLock(from) : undefined;
  if (previous && previous.rev === current.rev && previous.ref === current.ref)
    return undefined;

  return { from: previous, to: current };
}

function formatNixpkgsLock(lock: NixpkgsLock) {
  const date = lock.lastModified
    ? ` (${new Date(lock.lastModified * 1000).toISOString().slice(0, 10)})`
    : "";
  return `${lock.ref ?? "nixpkgs"} ${lock.rev.slice(0, 12)}${date}`;
}

function formatNixpkgsUpdate(update: NixpkgsUpdate) {
  const current = formatNixpkgsLock(update.to);
  if (!update.from) return `nixpkgs version: ${current}`;

  return `nixpkgs version: ${formatNixpkgsLock(update.from)} -> ${current}`;
}

function format(
  from: string,
  to: string,
  list: Commit[],
  update?: NixpkgsUpdate,
) {
  const groups = new Map<string, Commit[]>([
    ["Features", []],
    ["Improvements", []],
    ["Bugfixes", []],
  ]);

  for (const commit of list) {
    groups.get(commitType(commit.subject))!.push(commit);
  }

  const lines = [`Last release: ${from || "none"}`, `Target ref: ${ref(to)}`];
  if (update) lines.push(formatNixpkgsUpdate(update));
  lines.push("");

  if (list.length === 0 && !update) {
    lines.push("No notable changes.");
    return lines.join("\n");
  }

  for (const [title, entries] of groups) {
    if (entries.length === 0) continue;
    lines.push(`## ${title}`);
    for (const entry of entries) {
      lines.push(`- \`${entry.hash}\` ${entry.subject}`);
      if (entry.files.length > 0)
        lines.push(`  Files: ${entry.files.join(", ")}`);
    }
    lines.push("");
  }

  if (lines.at(-1) === "") lines.pop();
  return lines.join("\n");
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    from: { type: "string", short: "f" },
    to: { type: "string", short: "t", default: "HEAD" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Usage: node --experimental-strip-types scripts/raw-changelog.ts [options]

Options:
  -f, --from <ref>  Starting ref (default: latest tag, if any)
  -t, --to <ref>    Ending ref (default: HEAD)
  -h, --help        Show this help message
`);
  process.exit(0);
}

const from = values.from ?? latestTag();
const to = values.to ?? "HEAD";

console.log(format(from, to, commits(from, to), nixpkgsUpdate(from, to)));
