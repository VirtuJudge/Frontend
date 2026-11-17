# Home page promo video

Source for the silent product demo shown on the home page (`#product-demo`) and linked from the About page's "Watch the product demo" button. The output files are `public/videos/virtujudge-promo.mp4`, `.webm` and `-poster.webp`.

The video is an HTML page animated with GSAP. `render.mjs` loads it in Chromium, steps through it one frame at a time, and encodes the frames with ffmpeg. Changing copy or timing is a matter of editing `scene.html` and re-rendering.

## Render

From the Frontend repository root:

```bash
# Quick look at a few moments (seconds) before a full render
node scripts/promo-video/render.mjs preview 3 9 14.5 21 25.5

# Full render: about 4–5 minutes; replaces the files in public/videos
node scripts/promo-video/render.mjs
```

Requirements: ffmpeg with libx264, libvpx-vp9 and libwebp, plus Playwright's Chromium (`npx playwright install chromium`), or set `CHROMIUM_PATH` to an installed Chromium. Preview stills go to `scripts/promo-video/previews/` (git-ignored).

## Structure

| Time (s) | Scene |
|---|---|
| 0–4 | Title: "Before the real room, rehearse it here." |
| 4.4–10 | Step one: slide and presenter timeline |
| 10.4–16 | Step two: a judge question, marked on the slide |
| 16.6–22 | Step three: sample practice report |
| 22.6–27 | Close: logo, "Be the next one on stage.", URL |

The report and figures in the video are illustrative and labelled "Sample". Keep them consistent with the product: label bands are 40/60/80 and Q&A is 20% of the evaluation.

## Fonts

Instrument Serif and Bricolage Grotesque, both under the SIL Open Font License 1.1 (licences in `fonts/`). They are used only inside the video, not on the website.
