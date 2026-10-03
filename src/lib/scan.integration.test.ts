import assert from "node:assert/strict";
import { mkdtemp, mkdir, open, readFile, rm, symlink, utimes, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { after, describe, it } from "node:test";
import {
  LARGE_VIDEO_BYTES,
} from "./classify";
import { isBlockedPath, isInsideRoot } from "./guard";
import { removeEntries } from "./remove";
import { scanDirectory } from "./scan";

describe("path guard", () => {
  it("blocks system folders and allows home and temp", () => {
    assert.equal(isBlockedPath("/"), true);
    assert.equal(isBlockedPath("/usr"), true);
    assert.equal(isBlockedPath("/usr/bin"), true);
    assert.equal(isBlockedPath("/var"), true);
    assert.equal(isBlockedPath("/var/log"), true);
    assert.equal(isBlockedPath("/tmp"), false);
    assert.equal(isBlockedPath("/tmp/spare"), false);
    assert.equal(isBlockedPath("/var/tmp"), false);
    assert.equal(isBlockedPath("/var/tmp/spare"), false);
    assert.equal(isBlockedPath("/home/ubuntu"), false);
    assert.equal(isBlockedPath("/workspace"), false);
  });

  it("treats the scan root as off limits", () => {
    assert.equal(isInsideRoot("/tmp/closet", "/tmp/closet"), false);
    assert.equal(isInsideRoot("/tmp/closet", "/tmp/closet/notes.txt"), true);
    assert.equal(isInsideRoot("/tmp/closet", "/tmp/closet/../etc/passwd"), false);
  });
});

describe("scanDirectory", () => {
  const roots: string[] = [];

  after(async () => {
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  });

  it("sorts a small closet and refuses system paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "spare-"));
    roots.push(root);
    const project = path.join(root, "photo-blog");
    await mkdir(path.join(project, "src"), { recursive: true });
    await mkdir(path.join(project, "node_modules", "left-pad"), { recursive: true });
    await mkdir(path.join(project, "dist"), { recursive: true });
    await mkdir(path.join(root, "Downloads"), { recursive: true });
    await mkdir(path.join(root, "Library", "Caches", "browser"), { recursive: true });
    await mkdir(path.join(root, "Documents", "Caches"), { recursive: true });

    await writeFile(path.join(project, "package.json"), "{\"name\":\"photo-blog\"}\n");
    await writeFile(path.join(project, "src", "index.ts"), "export const title = \"blog\";\n");
    await writeFile(path.join(project, "node_modules", "left-pad", "index.js"), "module.exports = 1;\n");
    await writeFile(path.join(project, "dist", "index.js"), "compiled\n");
    await writeFile(path.join(project, "app.log"), "ready\n");
    await writeFile(path.join(root, "Documents", "essay.md"), "keep this draft\n");
    await writeFile(path.join(root, "Documents", "Caches", "family.jpg"), "not-a-browser-cache\n");
    const tax = "wages 64000\n";
    const original = path.join(root, "Documents", "return.pdf");
    const copy = path.join(root, "Documents", "return (copy).pdf");
    await writeFile(original, tax);
    await writeFile(copy, tax);
    const older = new Date(Date.now() - 60_000);
    await utimes(original, older, older);
    await writeFile(path.join(root, "Downloads", "Slack.dmg"), "installer\n");
    await writeFile(path.join(root, "Downloads", "photos.zip"), "archive\n");
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    const oldNotes = path.join(root, "Downloads", "setup-notes.txt");
    await writeFile(oldNotes, "whiteboard wifi\n");
    await utimes(oldNotes, old, old);
    await writeFile(path.join(root, "Library", "Caches", "browser", "data.bin"), "cached\n");
    await symlink("/etc/passwd", path.join(root, "passwd-link"));

    const videoHandle = await open(path.join(root, "clip.mp4"), "w");
    await videoHandle.write("ftyp");
    await videoHandle.truncate(LARGE_VIDEO_BYTES);
    await videoHandle.close();

    const result = await scanDirectory(root);
    const byName = new Map(result.entries.map((entry) => [entry.name, entry]));

    assert.equal(byName.get("node_modules")?.category, "dependencies");
    assert.equal(byName.get("node_modules")?.kind, "dir");
    assert.equal(byName.get("dist")?.category, "build");
    assert.equal(byName.get("Caches")?.category, "caches");
    assert.equal(byName.get("family.jpg")?.tier, "keep");
    assert.equal(byName.get("app.log")?.category, "logs");
    assert.equal(byName.get("Slack.dmg")?.category, "installers");
    assert.equal(byName.get("photos.zip")?.category, "archives");
    assert.equal(byName.get("setup-notes.txt")?.category, "downloads");
    assert.equal(byName.get("essay.md")?.tier, "keep");
    assert.equal(byName.get("index.ts")?.tier, "keep");
    assert.equal(byName.get("clip.mp4")?.category, "media");
    assert.equal(byName.get("return (copy).pdf")?.category, "duplicates");
    assert.equal(byName.get("return.pdf")?.tier, "keep");
    assert.equal(byName.has("passwd-link"), false);
    assert.equal(
      result.entries.some((entry) => entry.displayPath.includes(`${path.sep}etc${path.sep}`)),
      false,
    );

    await assert.rejects(() => scanDirectory("/usr"), /system folders/);

    const keep = byName.get("essay.md");
    assert.ok(keep);
    const denied = await removeEntries(result.scanId, [keep.id]);
    assert.equal(denied.removed.length, 0);
    assert.match(denied.failed[0]?.error ?? "", /keep/);
    assert.equal(await readFile(path.join(root, "Documents", "essay.md"), "utf8"), "keep this draft\n");

    const log = byName.get("app.log");
    assert.ok(log);
    const deleted = await removeEntries(result.scanId, [log.id]);
    assert.equal(deleted.removed.length, 1);
    await assert.rejects(() => readFile(path.join(project, "app.log"), "utf8"));
  });
});
