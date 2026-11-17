// Renders scene.html into the home page promo video.
//
//   node scripts/promo-video/render.mjs            # full render into public/videos
//   node scripts/promo-video/render.mjs preview 3 9 14.5   # PNG stills at those seconds
//
// Needs ffmpeg (with libx264, libvpx-vp9 and libwebp) and a Playwright Chromium
// (`npx playwright install chromium`). Rendering is frame-by-frame and
// deterministic: the same scene always produces the same frames.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public/videos");
const base = path.join(outDir, "virtujudge-promo");
const previewDir = path.join(here, "previews");
const POSTER_AT = 2.6;

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    if (input) input(child.stdin);
  });
}

const [mode, ...args] = process.argv.slice(2);
// Set CHROMIUM_PATH to use an already-installed Chromium instead of Playwright's own.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript({ path: require.resolve("gsap/dist/gsap.min.js") });
await page.goto(pathToFileURL(path.join(here, "scene.html")).href);
await page.evaluate(() => document.fonts.ready);

try {
  if (mode === "preview") {
    await mkdir(previewDir, { recursive: true });
    for (const t of args) {
      await page.evaluate((s) => window.renderAt(Number(s)), t);
      await page.screenshot({ path: path.join(previewDir, `frame-${t}.png`) });
    }
    console.log(`Wrote ${args.length} preview(s) to ${previewDir}`);
  } else {
    const { FPS, DURATION } = await page.evaluate(() => window.VIDEO);
    const total = Math.round(FPS * DURATION);
    await mkdir(outDir, { recursive: true });
    await run(
      "ffmpeg",
      ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "animation",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${base}.mp4`],
      async (stdin) => {
        for (let i = 0; i < total; i++) {
          await page.evaluate((t) => window.renderAt(t), i / FPS);
          const frame = await page.screenshot({ type: "png" });
          if (!stdin.write(frame)) await new Promise((r) => stdin.once("drain", r));
          if (i % (FPS * 3) === 0) console.log(`frame ${i}/${total}`);
        }
        stdin.end();
      },
    );
    await run("ffmpeg", ["-y", "-v", "error", "-i", `${base}.mp4`, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38",
      "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an", `${base}.webm`]);
    await run("ffmpeg", ["-y", "-v", "error", "-ss", String(POSTER_AT), "-i", `${base}.mp4`, "-frames:v", "1",
      "-c:v", "libwebp", "-quality", "82", `${base}-poster.webp`]);
    console.log(`Wrote ${base}.mp4, .webm and -poster.webp`);
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error("Page errors:\n" + errors.join("\n"));
  process.exit(1);
}
