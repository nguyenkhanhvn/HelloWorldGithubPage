/* Contrast audit across both colour schemes, including the hover fill. */
// Override with CHROME_PATH when Chrome/Edge lives somewhere else.
const CHROME = process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8765";

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + " " + (extra || "")); }
}

const AUDIT = function () {
  function parse(c) {
    const m = c.match(/[\d.]+/g).map(Number);
    return [m[0], m[1], m[2]];
  }
  function lum(rgb) {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }
  function ratio(fg, bg) {
    const a = lum(parse(fg)), b = lum(parse(bg));
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  }
  function resolve(token) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const probe = document.createElement("div");
    probe.style.backgroundColor = v;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return rgb;
  }

  const pageBg = getComputedStyle(document.body).backgroundColor;
  const out = {};
  const targets = {
    greeting: "#greeting",
    eyebrow: ".eyebrow",
    lang: "#greeting-lang",
    footer: ".footer p",
    brand: ".brand",
    counter: ".counter",
    ghostButton: ".button-ghost",
    primaryButton: ".button-primary",
    themeToggle: "#theme-toggle",
  };
  Object.keys(targets).forEach(function (key) {
    const el = document.querySelector(targets[key]);
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? pageBg : cs.backgroundColor;
    out[key] = ratio(cs.color, bg);
  });

  // :hover cannot be forced from page script, so measure the token it swaps in.
  out.primaryButtonHover = ratio(
    getComputedStyle(document.querySelector(".button-primary")).color,
    resolve("--accent-strong")
  );
  // Focus rings need 3:1 against the surface they sit on (WCAG 1.4.11).
  out.focusRing = ratio(resolve("--accent"), pageBg);
  return out;
};

(async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--disable-gpu", "--hide-scrollbars"],
  });

  try {
    for (const scheme of ["light", "dark"]) {
      console.log("\n[" + scheme + "]");
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
      await page.goto(BASE + "/", { waitUntil: "networkidle0" });

      const r = await page.evaluate(AUDIT);
      Object.keys(r).forEach(function (key) {
        // Text needs 4.5:1; the focus ring is a non-text indicator at 3:1.
        const min = key === "focusRing" ? 3 : 4.5;
        check(key + " " + r[key] + ":1 >= " + min, r[key] >= min);
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("harness error:", e); process.exit(2); });
