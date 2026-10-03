import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LARGE_AUDIO_BYTES,
  LARGE_IMAGE_BYTES,
  LARGE_VIDEO_BYTES,
  OLD_DOWNLOAD_MS,
  classifyDirectory,
  classifyFile,
  pickDuplicateExtras,
} from "./classify";

const now = Date.parse("2026-06-01T00:00:00Z");

describe("classifyDirectory", () => {
  it("treats node_modules as reinstallable", () => {
    const decision = classifyDirectory({
      name: "node_modules",
      parentName: "photo-blog",
      ancestorNames: ["Projects"],
      parentHasProjectMarker: true,
      parentHasNativeTargetMarker: false,
    });
    assert.equal(decision?.category, "dependencies");
    assert.equal(decision?.tier, "optional");
  });

  it("treats a cache under Library as optional", () => {
    const decision = classifyDirectory({
      name: "Caches",
      parentName: "Library",
      ancestorNames: ["Library"],
      parentHasProjectMarker: false,
      parentHasNativeTargetMarker: false,
    });
    assert.equal(decision?.category, "caches");
    assert.equal(decision?.tier, "optional");
  });

  it("does not treat a folder named Caches in Documents as a cache", () => {
    const decision = classifyDirectory({
      name: "Caches",
      parentName: "Documents",
      ancestorNames: ["Documents"],
      parentHasProjectMarker: false,
      parentHasNativeTargetMarker: false,
    });
    assert.equal(decision, null);
  });

  it("collapses dist only beside a project file", () => {
    const withProject = classifyDirectory({
      name: "dist",
      parentName: "photo-blog",
      ancestorNames: [],
      parentHasProjectMarker: true,
      parentHasNativeTargetMarker: false,
    });
    const withoutProject = classifyDirectory({
      name: "dist",
      parentName: "Photos",
      ancestorNames: [],
      parentHasProjectMarker: false,
      parentHasNativeTargetMarker: false,
    });
    assert.equal(withProject?.category, "build");
    assert.equal(withoutProject, null);
  });

  it("keeps version control history", () => {
    const decision = classifyDirectory({
      name: ".git",
      parentName: "photo-blog",
      ancestorNames: [],
      parentHasProjectMarker: true,
      parentHasNativeTargetMarker: false,
    });
    assert.equal(decision?.tier, "keep");
  });
});

describe("classifyFile", () => {
  it("marks logs and junk as optional", () => {
    assert.equal(
      classifyFile({
        name: "app.log",
        relativePath: "Projects/photo-blog/app.log",
        rootBaseName: "closet",
        bytes: 20,
        mtimeMs: now,
        now,
      }).category,
      "logs",
    );
    assert.equal(
      classifyFile({
        name: ".DS_Store",
        relativePath: "Desktop/.DS_Store",
        rootBaseName: "closet",
        bytes: 20,
        mtimeMs: now,
        now,
      }).tier,
      "optional",
    );
  });

  it("sends installers and archives to review", () => {
    assert.equal(
      classifyFile({
        name: "Slack.dmg",
        relativePath: "Downloads/Slack.dmg",
        rootBaseName: "closet",
        bytes: 10,
        mtimeMs: now,
        now,
      }).category,
      "installers",
    );
    assert.equal(
      classifyFile({
        name: "photos.zip",
        relativePath: "Downloads/photos.zip",
        rootBaseName: "closet",
        bytes: 10,
        mtimeMs: now - OLD_DOWNLOAD_MS - 1,
        now,
      }).category,
      "archives",
    );
  });

  it("flags only large media", () => {
    assert.equal(
      classifyFile({
        name: "webinar.mp4",
        relativePath: "Downloads/webinar.mp4",
        rootBaseName: "closet",
        bytes: LARGE_VIDEO_BYTES,
        mtimeMs: now,
        now,
      }).category,
      "media",
    );
    assert.equal(
      classifyFile({
        name: "clip.mp4",
        relativePath: "Desktop/clip.mp4",
        rootBaseName: "closet",
        bytes: LARGE_VIDEO_BYTES - 1,
        mtimeMs: now,
        now,
      }).tier,
      "keep",
    );
    assert.equal(
      classifyFile({
        name: "concert.flac",
        relativePath: "Music/concert.flac",
        rootBaseName: "closet",
        bytes: LARGE_AUDIO_BYTES,
        mtimeMs: now,
        now,
      }).category,
      "media",
    );
    assert.equal(
      classifyFile({
        name: "scan.tif",
        relativePath: "Documents/scan.tif",
        rootBaseName: "closet",
        bytes: LARGE_IMAGE_BYTES,
        mtimeMs: now,
        now,
      }).category,
      "media",
    );
  });

  it("reviews old downloads and keeps recent ones", () => {
    const oldFile = classifyFile({
      name: "notes.txt",
      relativePath: "Downloads/notes.txt",
      rootBaseName: "closet",
      bytes: 40,
      mtimeMs: now - OLD_DOWNLOAD_MS,
      now,
    });
    const recent = classifyFile({
      name: "notes.txt",
      relativePath: "Downloads/notes.txt",
      rootBaseName: "closet",
      bytes: 40,
      mtimeMs: now - OLD_DOWNLOAD_MS + 1000,
      now,
    });
    const whenRootIsDownloads = classifyFile({
      name: "notes.txt",
      relativePath: "notes.txt",
      rootBaseName: "Downloads",
      bytes: 40,
      mtimeMs: now - OLD_DOWNLOAD_MS,
      now,
    });
    assert.equal(oldFile.category, "downloads");
    assert.equal(recent.tier, "keep");
    assert.equal(whenRootIsDownloads.category, "downloads");
  });

  it("keeps ordinary documents", () => {
    const decision = classifyFile({
      name: "essay-draft.md",
      relativePath: "Documents/writing/essay-draft.md",
      rootBaseName: "closet",
      bytes: 80,
      mtimeMs: now - OLD_DOWNLOAD_MS * 2,
      now,
    });
    assert.equal(decision.tier, "keep");
  });
});

describe("pickDuplicateExtras", () => {
  it("keeps the older copy and marks the rest", () => {
    const extras = pickDuplicateExtras([
      {
        id: "new",
        relativePath: "Documents/taxes/2024-return (copy).pdf",
        mtimeMs: 200,
        hash: "abc",
      },
      {
        id: "old",
        relativePath: "Documents/taxes/2024-return.pdf",
        mtimeMs: 100,
        hash: "abc",
      },
      {
        id: "solo",
        relativePath: "Documents/other.pdf",
        mtimeMs: 100,
        hash: "zzz",
      },
    ]);
    assert.equal(extras.get("new"), "Documents/taxes/2024-return.pdf");
    assert.equal(extras.has("old"), false);
    assert.equal(extras.has("solo"), false);
  });
});
