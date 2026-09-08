/**
 * Hello World - client-side behaviour.
 *
 * Everything runs in the browser: there is no backend, no API call and no
 * build step. The script is loaded at the end of <body>, so the DOM is
 * already parsed by the time this file executes.
 */
(function () {
  "use strict";

  /** Greetings cycled through by the "another language" button. */
  var GREETINGS = [
    { text: "Hello, World!", lang: "English", code: "en" },
    { text: "Xin chào, Thế giới!", lang: "Tiếng Việt", code: "vi" },
    { text: "¡Hola, Mundo!", lang: "Español", code: "es" },
    { text: "Bonjour, le Monde !", lang: "Français", code: "fr" },
    { text: "Hallo, Welt!", lang: "Deutsch", code: "de" },
    { text: "Ciao, Mondo!", lang: "Italiano", code: "it" },
    { text: "Olá, Mundo!", lang: "Português", code: "pt" },
    { text: "Привет, мир!", lang: "Русский", code: "ru" },
    { text: "こんにちは世界！", lang: "日本語", code: "ja" },
    { text: "안녕하세요, 세계!", lang: "한국어", code: "ko" },
    { text: "你好，世界！", lang: "中文", code: "zh" },
    { text: "مرحبا بالعالم!", lang: "العربية", code: "ar" }
  ];

  /** localStorage key for the visitor's explicit theme choice. */
  var THEME_KEY = "hello-world:theme";

  var greetingEl = document.getElementById("greeting");
  var greetingLangEl = document.getElementById("greeting-lang");
  var nextButton = document.getElementById("next-greeting");
  var counterEl = document.getElementById("counter");
  var themeToggle = document.getElementById("theme-toggle");
  var buildTimeEl = document.getElementById("build-time");

  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  var greetingIndex = 0;
  var shownCount = 1;

  /* ----------------------------------------------------------- greetings */

  /**
   * Render one greeting and restart the fade-in animation.
   * @param {number} index Position in GREETINGS; wraps around automatically.
   */
  function showGreeting(index) {
    var greeting = GREETINGS[index % GREETINGS.length];

    greetingEl.textContent = greeting.text;
    greetingLangEl.textContent = greeting.lang;

    // lang/dir keep screen readers and bidirectional text correct.
    greetingEl.setAttribute("lang", greeting.code);
    greetingEl.setAttribute("dir", greeting.code === "ar" ? "rtl" : "ltr");

    restartAnimation(greetingEl);
    restartAnimation(greetingLangEl);
  }

  /**
   * Re-trigger a CSS animation by removing the class and forcing a reflow
   * before adding it back.
   * @param {HTMLElement} el
   */
  function restartAnimation(el) {
    el.classList.remove("is-swapping");
    void el.offsetWidth; // reflow: without this the class swap is coalesced
    el.classList.add("is-swapping");
  }

  nextButton.addEventListener("click", function () {
    greetingIndex = (greetingIndex + 1) % GREETINGS.length;
    shownCount += 1;

    showGreeting(greetingIndex);
    counterEl.textContent = String(shownCount);
  });

  /* --------------------------------------------------------------- theme */

  /**
   * Persist the theme choice, ignoring storage failures.
   * @param {"light"|"dark"} theme
   */
  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* Nothing to do: the choice simply will not survive a reload. */
    }
  }

  /** @returns {"light"|"dark"} The theme currently painted on screen. */
  function currentTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") {
      return explicit;
    }
    return darkQuery.matches ? "dark" : "light";
  }

  /**
   * Describe the current theme on the toggle for assistive technology.
   * @param {"light"|"dark"} theme
   */
  function syncToggleState(theme) {
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  /**
   * Paint a theme and remember it for the next visit.
   * @param {"light"|"dark"} theme
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    syncToggleState(theme);
    storeTheme(theme);
  }

  themeToggle.addEventListener("click", function () {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  /* ---------------------------------------------------------------- init */

  /**
   * Show when the page was last loaded. There is no server to report a real
   * build time, so the load timestamp is the honest thing to display.
   */
  function renderLoadTime() {
    var now = new Date();
    buildTimeEl.textContent = "Loaded " + now.toLocaleString();
  }

  // The inline <head> script already applied any stored theme; here we only
  // sync the toggle's ARIA state with whatever is on screen.
  syncToggleState(currentTheme());

  // While no explicit choice is stored, keep following the OS preference.
  darkQuery.addEventListener("change", function () {
    if (!document.documentElement.hasAttribute("data-theme")) {
      syncToggleState(currentTheme());
    }
  });

  showGreeting(greetingIndex);
  renderLoadTime();
})();
