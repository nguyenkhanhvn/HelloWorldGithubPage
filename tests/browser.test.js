/* Real-browser checks: responsive layout, overflow, contrast, interactions. */
const path = require("path");

// Override with CHROME_PATH when Chrome/Edge lives somewhere else.
const CHROME = process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8765";
const OUT = path.join(__dirname, "screenshots");
require("fs").mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + " " + (extra === undefined ? "" : extra)); }
}

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 700 },
  { name: "mobile-390", width: 390, height: 780 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

async function overflowReport(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
        offenders.push(el.tagName.toLowerCase() +
          (el.className ? "." + String(el.className).split(" ")[0] : "") +
          " [" + Math.round(r.left) + ".." + Math.round(r.right) + "]");
      }
    });
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders: offenders,
    };
  });
}

(async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--disable-gpu", "--hide-scrollbars"],
  });

  try {
    console.log("\n[responsive] no horizontal overflow");
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.goto(BASE + "/", { waitUntil: "networkidle0" });
      const rep = await overflowReport(page);
      check(vp.name + " fits (" + rep.scrollWidth + " <= " + rep.clientWidth + ")",
        rep.scrollWidth <= rep.clientWidth + 1, rep.offenders.join(", "));
      await page.close();
    }

    console.log("\n[responsive] longest greeting still fits");
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.goto(BASE + "/", { waitUntil: "networkidle0" });
      // Click through every greeting and watch for overflow at each step.
      let worst = null;
      for (let i = 0; i < 12; i++) {
        await page.click("#next-greeting");
        const rep = await overflowReport(page);
        if (rep.scrollWidth > rep.clientWidth + 1) {
          const text = await page.$eval("#greeting", (el) => el.textContent);
          worst = text + " -> " + rep.scrollWidth + "px";
          break;
        }
      }
      check(vp.name + " handles all 12 greetings", worst === null, worst || "");
      await page.close();
    }

    console.log("\n[interaction] button + theme toggle in a real browser");
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      await page.goto(BASE + "/", { waitUntil: "networkidle0" });

      check("no page errors", errors.length === 0, errors.join("; "));

      const before = await page.$eval("#greeting", (el) => el.textContent);
      await page.click("#next-greeting");
      const after = await page.$eval("#greeting", (el) => el.textContent);
      check("clicking changes the greeting", before !== after, before + " -> " + after);
      check("counter follows", (await page.$eval("#counter", (el) => el.textContent)) === "2");

      await page.click("#theme-toggle");
      const theme = await page.$eval("html", (el) => el.getAttribute("data-theme"));
      check("toggle sets a theme", theme === "dark" || theme === "light", theme);

      // The choice must survive a reload.
      await page.reload({ waitUntil: "networkidle0" });
      const restored = await page.$eval("html", (el) => el.getAttribute("data-theme"));
      check("theme survives reload", restored === theme, restored + " vs " + theme);

      // Keyboard reachability.
      const focusable = await page.evaluate(() => {
        const order = [];
        const els = document.querySelectorAll("a[href], button");
        els.forEach((el) => order.push(el.id || el.textContent.trim().slice(0, 20)));
        return order;
      });
      check("all controls are natively focusable", focusable.length >= 3, focusable.join(" | "));
      await page.close();
    }

    console.log("\n[contrast] text vs background");
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(BASE + "/", { waitUntil: "networkidle0" });

      const ratios = await page.evaluate(() => {
        function parse(c) {
          const m = c.match(/\d+(\.\d+)?/g).map(Number);
          return [m[0], m[1], m[2]];
        }
        function lum([r, g, b]) {
          const f = (v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        }
        function ratio(fg, bg) {
          const a = lum(parse(fg)), b = lum(parse(bg));
          const hi = Math.max(a, b), lo = Math.min(a, b);
          return (hi + 0.05) / (lo + 0.05);
        }
        const pageBg = getComputedStyle(document.body).backgroundColor;
        const out = {};
        const targets = {
          greeting: "#greeting",
          eyebrow: ".eyebrow",
          lang: "#greeting-lang",
          footer: ".footer p",
          primaryButton: ".button-primary",
        };
        for (const key in targets) {
          const el = document.querySelector(targets[key]);
          const cs = getComputedStyle(el);
          const bg = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? pageBg : cs.backgroundColor;
          out[key] = Math.round(ratio(cs.color, bg) * 100) / 100;
        }
        return out;
      });

      for (const key in ratios) {
        const min = key === "eyebrow" || key === "lang" || key === "footer" ? 4.5 : 4.5;
        check(key + " contrast " + ratios[key] + ":1 >= " + min, ratios[key] >= min);
      }
      await page.close();
    }

    console.log("\n[screenshots]");
    {
      const shots = [
        { file: "final-light.png", w: 1280, h: 800, scheme: "light" },
        { file: "final-dark.png", w: 1280, h: 800, scheme: "dark" },
        { file: "final-mobile.png", w: 390, h: 780, scheme: "light" },
        { file: "final-404.png", w: 1280, h: 800, scheme: "light", url: "/404.html" },
      ];
      for (const s of shots) {
        const page = await browser.newPage();
        await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: s.scheme },
        ]);
        // Earlier tests toggled the theme, and localStorage is shared across
        // pages of the same origin in one browser. Clear it so the shot really
        // reflects the emulated OS preference.
        await page.goto(BASE + (s.url || "/"), { waitUntil: "domcontentloaded" });
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await page.reload({ waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 500)); // let the fade-in settle
        await page.screenshot({ path: path.join(OUT, s.file) });
        console.log("  saved " + s.file);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("harness error:", e); process.exit(2); });
