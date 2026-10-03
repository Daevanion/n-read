import { access, mkdir, open, rm, utimes, writeFile } from "fs/promises";
import path from "path";

export const SAMPLE_DIR_NAME = "sample-closet";

const MB = 1024 * 1024;

export function sampleRoot(): string {
  return path.join(process.cwd(), SAMPLE_DIR_NAME);
}

export async function ensureSample(): Promise<string> {
  const root = sampleRoot();
  try {
    await access(path.join(root, ".spare-sample"));
    return root;
  } catch {
    await seedSample(root);
    return root;
  }
}

export async function resetSample(): Promise<string> {
  const root = sampleRoot();
  await rm(root, { recursive: true, force: true });
  await seedSample(root);
  return root;
}

export async function seedSample(root: string): Promise<void> {
  const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
  const taxReturn = [
    "2024 tax return",
    "Wages: 64000",
    "Withholding: 8100",
    "This is the copy Spare should keep.",
  ].join("\n");

  await writeText(path.join(root, "Desktop", "recipe-card.txt"), "Olive oil, lemon, salt.\n");
  await writeText(path.join(root, "Desktop", ".DS_Store"), "desktop-services-store\n");
  await writeSparse(
    path.join(root, "Desktop", "screen-recording.mov"),
    60 * MB,
    "ftypqt  ",
  );

  await writeText(
    path.join(root, "Documents", "taxes", "2024-return.pdf"),
    taxReturn,
    new Date(Date.now() - 60_000),
  );
  await writeText(
    path.join(root, "Documents", "taxes", "2024-return (copy).pdf"),
    taxReturn,
  );
  await writeText(
    path.join(root, "Documents", "writing", "essay-draft.md"),
    "# On keeping less\n\nA short draft worth keeping.\n",
  );
  await writeText(
    path.join(root, "Documents", "taxes", "receipt.jpg"),
    "tiny-jpeg-placeholder",
  );

  await writeSparse(path.join(root, "Downloads", "Slack-4.41.dmg"), 18 * MB, "koly");
  await writeSparse(
    path.join(root, "Downloads", "holiday-photos.zip"),
    35 * MB,
    "PK\u0003\u0004",
  );
  await writeSparse(
    path.join(root, "Downloads", "webinar-recording.mp4"),
    80 * MB,
    "ftypisom",
  );
  await writeSparse(path.join(root, "Downloads", "ChromeSetup.exe"), 8 * MB, "MZ");
  await writeText(
    path.join(root, "Downloads", "setup-notes.txt"),
    "Wifi password was on the whiteboard.\n",
    old,
  );
  await writeText(
    path.join(root, "Downloads", "budget.xlsx"),
    "month,rent,groceries\nJanuary,1800,420\n",
  );
  await writeSparse(path.join(root, "Downloads", "interview.mp3"), 2 * MB, "ID3");

  const project = path.join(root, "Projects", "photo-blog");
  await writeText(
    path.join(project, "package.json"),
    JSON.stringify({ name: "photo-blog", private: true }, null, 2),
  );
  await writeText(
    path.join(project, "package-lock.json"),
    JSON.stringify({ name: "photo-blog", lockfileVersion: 3 }, null, 2),
  );
  await writeText(
    path.join(project, "README.md"),
    "# Photo blog\n\nSource worth keeping.\n",
  );
  await writeText(
    path.join(project, "src", "index.ts"),
    "export const title = \"Photo blog\";\n",
  );
  await writeText(
    path.join(project, "app.log"),
    "ready on port 3000\ncompiled client\n",
  );
  await writeText(path.join(project, "dist", "index.js"), "export const title = \"Photo blog\";\n");
  await writeText(path.join(project, ".next", "BUILD_ID"), "sample-build\n");
  await writeSparse(
    path.join(project, ".next", "cache", "webpack", "client-production.pack"),
    5 * MB,
    "webpack-cache",
  );

  const packages = ["react", "react-dom", "next", "left-pad", "lodash", "date-fns"];
  for (const name of packages) {
    for (let index = 0; index < 8; index += 1) {
      await writeText(
        path.join(project, "node_modules", name, `file-${index}.js`),
        `module.exports = { name: "${name}", index: ${index} };\n`,
      );
    }
  }

  const garden = path.join(root, "Projects", "garden-notes");
  await writeText(
    path.join(garden, "pyproject.toml"),
    "[project]\nname = \"garden-notes\"\nversion = \"0.1.0\"\n",
  );
  await writeText(
    path.join(garden, "src", "prune.py"),
    "def prune(bed: str) -> str:\n    return f\"pruned {bed}\"\n",
  );
  await writeText(path.join(garden, "garden.log"), "watered tomatoes\n");
  await writeText(path.join(garden, ".venv", "pyvenv.cfg"), "home = /usr/bin\n");
  await writeSparse(
    path.join(garden, ".venv", "lib", "python3.12", "site-packages", "requests", "models.py"),
    4 * MB,
    "# requests\n",
  );
  await writeText(
    path.join(garden, "__pycache__", "prune.cpython-312.pyc"),
    "pyc-bytecode",
  );

  await writeSparse(
    path.join(root, "Library", "Caches", "com.example.browser", "Cache", "data_0.bin"),
    12 * MB,
    "cache",
  );
  await writeText(
    path.join(root, "Library", "Caches", "thumbnails", "thumb_001.jpg"),
    "thumb",
  );

  await writeText(
    path.join(root, ".spare-sample"),
    JSON.stringify(
      {
        version: 1,
        note: "Placeholder files created by Spare so you can practice sorting and deleting.",
      },
      null,
      2,
    ),
  );
}

async function writeText(file: string, contents: string, mtime?: Date): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
  if (mtime) await utimes(file, mtime, mtime);
}

async function writeSparse(file: string, bytes: number, prefix: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(file, "w");
  try {
    await handle.write(prefix);
    if (bytes > Buffer.byteLength(prefix)) await handle.truncate(bytes);
  } finally {
    await handle.close();
  }
}
