const puppeteer = require("puppeteer");
const nodePath = require("path");
(async () => {
  const out = nodePath.join(__dirname, process.argv[2] || "shot.png");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 940, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));
  // hover over the hero 3D scene, off-center, to induce the tilt
  const box = await page.evaluate(() => {
    const el = document.querySelector(".hp-hero-3d");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * 0.72, y: r.top + r.height * 0.32 };
  });
  if (box) { await page.mouse.move(box.x, box.y); }
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1440, height: 940 } });
  await browser.close();
  console.log("saved", out);
})().catch((e) => { console.error(e); process.exit(1); });
