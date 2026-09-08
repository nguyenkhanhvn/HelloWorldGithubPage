/* Headless smoke test for the Hello World site (run with node). */
const { JSDOM, VirtualConsole } = require("jsdom");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8765";
let pass = 0, fail = 0;

function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + " " + (extra || "")); }
}

/**
 * jsdom implements neither matchMedia nor a shared storage area between
 * instances, so a bootstrap <script> is injected at the very top of <head>:
 * it stubs matchMedia and, when asked, seeds localStorage *before* the page's
 * own inline theme script runs. Nothing in the site is modified.
 */
function bootstrapScript(opts) {
  const prefersDark = opts.prefersDark ? "true" : "false";
  const seed = opts.storedTheme
    ? 'try { localStorage.setItem("hello-world:theme", ' +
      JSON.stringify(opts.storedTheme) + '); } catch (e) {}'
    : "";
  return (
    "<script>" +
    "window.matchMedia = function (q) {" +
    "  var dark = q.indexOf('prefers-color-scheme: dark') !== -1;" +
    "  return { matches: dark && " + prefersDark + ", media: q," +
    "    addEventListener: function () {}, removeEventListener: function () {}," +
    "    addListener: function () {}, removeListener: function () {} };" +
    "};" +
    seed +
    "<\/script>"
  );
}

function makeDom(html, url, opts) {
  opts = opts || {};
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", (e) => errors.push(e.message));

  const withStub = html.replace(/<head([^>]*)>/i, "<head$1>" + bootstrapScript(opts));

  const dom = new JSDOM(withStub, {
    url: url,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom: dom, errors: errors };
}

function onLoad(w) {
  return new Promise((r) => w.addEventListener("load", r, { once: true }));
}

async function fetchText(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(path + " -> HTTP " + res.status);
  return res.text();
}

function click(w, el) {
  el.dispatchEvent(new w.Event("click", { bubbles: true }));
}

(async () => {
  const html = await fetchText("/index.html");
  const js = await fetchText("/assets/js/main.js");
  const css = await fetchText("/assets/css/style.css");

  console.log("\n[index.html] structure");
  {
    const { dom } = makeDom(html, BASE + "/");
    const d = dom.window.document;
    check("title is 'Hello World'", d.title === "Hello World", "got " + d.title);
    check("lang attribute is en", d.documentElement.lang === "en");
    check("has viewport meta", !!d.querySelector('meta[name="viewport"]'));
    check("has description meta", !!d.querySelector('meta[name="description"]'));
    ["greeting", "greeting-lang", "next-greeting", "counter", "theme-toggle", "build-time"]
      .forEach((id) => check("#" + id + " exists", !!d.getElementById(id)));
    check("stylesheet path is relative",
      d.querySelector('link[rel="stylesheet"]').getAttribute("href") === "assets/css/style.css");
    const localRefs = Array.from(d.querySelectorAll("[src],[href]"))
      .map((el) => el.getAttribute("src") || el.getAttribute("href"))
      .filter((v) => !/^https?:/.test(v));
    check("no root-absolute local paths (project-site safe)",
      localRefs.every((v) => v.charAt(0) !== "/"), "got " + JSON.stringify(localRefs));
    dom.window.close();
  }

  console.log("\n[behaviour] greeting cycling");
  {
    const { dom, errors } = makeDom(html, BASE + "/");
    const w = dom.window, d = w.document;
    await onLoad(w);
    check("no script errors on load", errors.length === 0, errors.join("; "));

    const first = d.getElementById("greeting").textContent;
    check("initial greeting is English", first === "Hello, World!", "got " + first);
    check("counter starts at 1", d.getElementById("counter").textContent === "1");
    check("build-time filled in", /^Loaded /.test(d.getElementById("build-time").textContent));

    const btn = d.getElementById("next-greeting");
    const seen = new Set([first]);
    for (let i = 0; i < 11; i++) {
      click(w, btn);
      seen.add(d.getElementById("greeting").textContent);
    }
    check("12 distinct greetings", seen.size === 12, "got " + seen.size);
    check("counter reached 12", d.getElementById("counter").textContent === "12",
      "got " + d.getElementById("counter").textContent);

    click(w, btn);
    check("cycle wraps back to the first greeting",
      d.getElementById("greeting").textContent === "Hello, World!");
    check("counter keeps counting past one full cycle",
      d.getElementById("counter").textContent === "13");

    let dirSeen = null;
    for (let i = 0; i < 12; i++) {
      click(w, btn);
      if (d.getElementById("greeting").getAttribute("lang") === "ar") {
        dirSeen = d.getElementById("greeting").getAttribute("dir");
      }
    }
    check("Arabic greeting sets dir=rtl", dirSeen === "rtl", "got " + dirSeen);
    w.close();
  }

  console.log("\n[behaviour] theme toggle");
  {
    const { dom } = makeDom(html, BASE + "/theme-test");
    const w = dom.window, d = w.document;
    await onLoad(w);
    const toggle = d.getElementById("theme-toggle");

    check("no data-theme forced when nothing is stored",
      !d.documentElement.hasAttribute("data-theme"),
      "got " + d.documentElement.getAttribute("data-theme"));

    check("toggle starts at aria-pressed=false on a light OS",
      toggle.getAttribute("aria-pressed") === "false",
      "got " + toggle.getAttribute("aria-pressed"));

    click(w, toggle);
    check("first click switches to dark",
      d.documentElement.getAttribute("data-theme") === "dark",
      "got " + d.documentElement.getAttribute("data-theme"));
    check("aria-pressed becomes true", toggle.getAttribute("aria-pressed") === "true");
    check("aria-label describes the next action",
      toggle.getAttribute("aria-label") === "Switch to light mode",
      "got " + toggle.getAttribute("aria-label"));
    check("dark choice persisted to localStorage",
      w.localStorage.getItem("hello-world:theme") === "dark",
      "got " + w.localStorage.getItem("hello-world:theme"));

    click(w, toggle);
    check("second click switches back to light",
      d.documentElement.getAttribute("data-theme") === "light",
      "got " + d.documentElement.getAttribute("data-theme"));
    check("aria-pressed back to false", toggle.getAttribute("aria-pressed") === "false");
    check("light choice persisted",
      w.localStorage.getItem("hello-world:theme") === "light");
    w.close();
  }

  console.log("\n[behaviour] stored theme applied before first paint");
  {
    // Stored theme = dark while the OS says light: the stored choice must win.
    const { dom } = makeDom(html, BASE + "/restore-test",
      { storedTheme: "dark", prefersDark: false });
    const d = dom.window.document;
    check("inline head script applies stored theme synchronously",
      d.documentElement.getAttribute("data-theme") === "dark",
      "got " + d.documentElement.getAttribute("data-theme"));
    await onLoad(dom.window);
    check("toggle state matches the restored theme",
      d.getElementById("theme-toggle").getAttribute("aria-pressed") === "true");
    dom.window.close();
  }

  console.log("\n[behaviour] OS dark preference with nothing stored");
  {
    const { dom } = makeDom(html, BASE + "/os-dark", { prefersDark: true });
    const w = dom.window, d = w.document;
    await onLoad(w);
    check("data-theme stays unset so the CSS media query rules",
      !d.documentElement.hasAttribute("data-theme"),
      "got " + d.documentElement.getAttribute("data-theme"));
    check("toggle reports dark from matchMedia",
      d.getElementById("theme-toggle").getAttribute("aria-pressed") === "true",
      "got " + d.getElementById("theme-toggle").getAttribute("aria-pressed"));
    w.close();
  }

  console.log("\n[404.html]");
  {
    const html404 = await fetchText("/404.html");
    check("404 page is self-contained (no external stylesheet)",
      !/rel="stylesheet"/.test(html404));

    const a = makeDom(html404, "https://someuser.github.io/my-repo/missing/page");
    await onLoad(a.dom.window);
    const hrefA = a.dom.window.document.getElementById("home-link").getAttribute("href");
    check("project site link -> /my-repo/", hrefA === "/my-repo/", "got " + hrefA);
    a.dom.window.close();

    const b = makeDom(html404, "https://example.com/deep/missing");
    await onLoad(b.dom.window);
    const hrefB = b.dom.window.document.getElementById("home-link").getAttribute("href");
    check("custom domain link -> /", hrefB === "/", "got " + hrefB);
    b.dom.window.close();
  }

  console.log("\n[static checks]");
  {
    check("no leftover console.log in main.js", !/console\.log/.test(js));
    check("main.js runs in strict mode", /"use strict"/.test(js));
    check("css defines tokens on :root", /:root\s*\{[\s\S]*?--bg:/.test(css));
    check("css has an explicit dark override", /\[data-theme="dark"\]/.test(css));
    check("css honours prefers-reduced-motion", /prefers-reduced-motion/.test(css));
    check("css handles prefers-color-scheme", /prefers-color-scheme/.test(css));
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("test harness error:", e); process.exit(2); });
