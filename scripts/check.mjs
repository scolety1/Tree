import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const runJs = args.size === 0 || args.has("--js");
const runSafety = args.size === 0 || args.has("--safety");
const runJson = args.size === 0 || args.has("--json");

const jsDirs = ["js", "api"];
const jsonFiles = ["firebase.json", "firestore.indexes.json", "vercel.json", "package.json"];
const safetyDirs = ["js", "api", "html"];
const unsafePatterns = [
  { label: "innerHTML", pattern: /\binnerHTML\b/ },
  { label: "outerHTML", pattern: /\bouterHTML\b/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "eval", pattern: /\beval\s*\(/ },
  { label: "new Function", pattern: /\bnew\s+Function\s*\(/ },
];

async function walk(dir) {
  const fullDir = path.join(root, dir);
  const entries = await readdir(fullDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

async function collectFiles(dirs, extensions) {
  const files = [];
  for (const dir of dirs) {
    const entries = await walk(dir);
    files.push(...entries.filter(file => extensions.includes(path.extname(file))));
  }
  return files;
}

function runNodeCheck(file) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`${file} failed syntax check:\n${result.stderr || result.stdout}`);
  }
}

async function checkJavaScript() {
  const files = await collectFiles(jsDirs, [".js"]);
  files.forEach(runNodeCheck);
  console.log(`JavaScript syntax ok (${files.length} files).`);
}

async function checkJson() {
  for (const file of jsonFiles) {
    const content = await readFile(path.join(root, file), "utf8");
    JSON.parse(content);
  }
  console.log(`JSON config ok (${jsonFiles.length} files).`);
}

async function checkSafety() {
  const files = await collectFiles(safetyDirs, [".js", ".html"]);
  const findings = [];

  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      unsafePatterns.forEach(({ label, pattern }) => {
        if (pattern.test(line)) {
          findings.push(`${file}:${index + 1}: avoid ${label}`);
        }
      });
    });
  }

  if (findings.length > 0) {
    throw new Error(`Unsafe rendering/API patterns found:\n${findings.join("\n")}`);
  }

  console.log(`Unsafe rendering scan ok (${files.length} files).`);
}

try {
  if (runJs) await checkJavaScript();
  if (runJson) await checkJson();
  if (runSafety) await checkSafety();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
