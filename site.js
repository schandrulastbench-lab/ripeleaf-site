// ripeleaf.app — small, local-only interactions. No network requests, no storage, no tracking.
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };

  // --- Visitor's own time: greeting, dates, and the hero glow's hue (like the app's "Good evening") ---
  var now = new Date(), h = now.getHours();
  var greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  $$("[data-greet]").forEach(function (el) { el.textContent = greet; });
  var fmt = function (d) {
    try { return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }); }
    catch (e) { return ""; }
  };
  var today = fmt(now);
  if (today) $$("[data-today], [data-today-short]").forEach(function (el) { el.textContent = today; });
  // Morning = honey, day = lime, evening = terracotta, night = dusty blue.
  var glow = h >= 5 && h < 10 ? "#e0b760" : h >= 10 && h < 16 ? "#a9c46c" : h >= 16 && h < 21 ? "#d98c5f" : "#7ba0b3";
  var stage = $(".hero-stage");
  if (stage) stage.style.setProperty("--glow", glow);

  // --- Brand mark = a water ring that fills as you read down the page ---
  var ring = $(".brand .fill");
  if (ring) {
    var tick = false;
    var onScroll = function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        var max = Math.max(1, root.scrollHeight - innerHeight);
        var p = Math.min(1, Math.max(0, scrollY / max));
        ring.style.setProperty("--read", String(100 - (28 + p * 72)));
        tick = false;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // --- Reveal on scroll. Only hides what is still below the fold, so the page is complete at rest. ---
  var io = "IntersectionObserver" in window && !reduce;
  if (io) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove("pre"); revealer.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); revealer.observe(el); }
    });
  }

  // --- Water rings fill when they come into view ---
  var rings = $("[data-rings]");
  if (rings) {
    if (io) {
      var ro = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { rings.classList.remove("waiting"); ro.disconnect(); }
      }, { threshold: 0.35 });
      ro.observe(rings);
    } else {
      rings.classList.remove("waiting");
    }
  }

  // --- The working Today screen ---
  var screen = $("#today-screen");
  if (screen) {
    var count = $("[data-count]", screen), hint = $("[data-hint]"), reset = $("[data-reset]");
    var markup = screen.innerHTML;
    var wire = function () {
      count = $("[data-count]", screen);
      $$(".done", screen).forEach(function (b) {
        b.addEventListener("click", function () { finish([b.closest(".task")]); });
      });
      $$("[data-markall]", screen).forEach(function (b) {
        b.addEventListener("click", function () { finish($$(".task", b.closest("[data-room]"))); });
      });
    };
    var refresh = function () {
      var left = $$(".task:not(.leaving)", screen);
      count.textContent = String(left.length);
      $$("[data-room]", screen).forEach(function (room) {
        var n = $$(".task:not(.leaving)", room).length;
        var btn = $("[data-markall]", room);
        if (btn) { btn.textContent = "Mark all (" + n + ")"; btn.hidden = n < 2; }
      });
      if (!left.length) {
        setTimeout(function () {
          $$("[data-room]", screen).forEach(function (r) { r.hidden = true; });
          screen.classList.add("cleared");
        }, reduce ? 0 : 450);
        if (hint) hint.textContent = "That's everything for today.";
        if (reset) reset.hidden = false;
      }
    };
    var finish = function (tasks) {
      tasks.forEach(function (t, i) {
        if (!t || t.classList.contains("leaving")) return;
        var btn = $(".done", t);
        if (btn) { btn.innerHTML = '<svg width="14" height="14"><use href="#i-check"/></svg>'; btn.style.background = "#a9c46c"; btn.disabled = true; }
        setTimeout(function () {
          t.classList.add("leaving");
          setTimeout(function () {
            t.hidden = true;
            var room = t.closest("[data-room]");
            if (room && !$$(".task:not([hidden])", room).length) room.hidden = true;
          }, reduce ? 0 : 520);
          refresh();
        }, reduce ? 0 : 300 + i * 120);
      });
    };
    if (reset) reset.addEventListener("click", function () {
      screen.innerHTML = markup;
      screen.classList.remove("cleared");
      $$("[data-greet]", screen).forEach(function (el) { el.textContent = greet; });
      if (today) $$("[data-today]", screen).forEach(function (el) { el.textContent = today; });
      if (hint) hint.innerHTML = "Go on, tap <b>Done</b>. It's a working copy of the Today screen.";
      reset.hidden = true;
      wire();
    });
    wire();
  }

  // --- Reminder tone (the app's three real tones) ---
  var tones = {
    gentle: ["Monty could use a drink 💧", "A quick water and they'll be happy. Tap to mark it done."],
    straight: ["Water Monty", "Monty is due for water. Tap to mark it done."],
    playful: ["Monty is getting parched 🥵💧", "Quick — Monty's thirsty! Tap when you've poured. 💦"]
  };
  var nt = $("[data-n-title]"), nb = $("[data-n-body]");
  $$("[data-tone]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = tones[b.getAttribute("data-tone")];
      $$("[data-tone]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      if (nt && t) { nt.textContent = t[0]; nb.textContent = t[1]; }
    });
  });

  // --- Accent swatches recolour the whole page, the way the app's accent setting does ---
  var isDark = function () {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  };
  var current = null;
  var apply = function () {
    if (!current) return;
    root.style.setProperty("--accent", isDark() ? current.d : current.l);
    root.style.setProperty("--terracotta", current.d);
  };
  $$("[data-accent]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-accent]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      current = { d: b.getAttribute("data-accent"), l: b.getAttribute("data-accent-l") };
      apply();
    });
  });
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", apply);
  }

  // --- Species ticker: real names from the catalogue ---
  var names = [
    ["Black Kangaroo Paw", "Macropidia fuliginosa"], ["Monstera", "Monstera deliciosa"], ["Venus Flytrap", "Dionaea muscipula"],
    ["Fiddle Leaf Fig", "Ficus lyrata"], ["Waratah", "Telopea speciosissima"], ["String of Pearls", "Curio rowleyanus"],
    ["Boston Fern", "Nephrolepis exaltata"], ["Moth Orchid", "Phalaenopsis"], ["Grevillea Robusta", "Grevillea robusta"],
    ["Hoya Australis", "Hoya australis"], ["Staghorn Fern", "Platycerium bifurcatum"], ["Thai Basil", "Ocimum basilicum var. thyrsiflora"],
    ["Bird of Paradise", "Strelitzia nicolai"], ["ZZ Plant", "Zamioculcas zamiifolia"], ["Tillandsia Stricta", "Tillandsia stricta"],
    ["Rosemary", "Salvia rosmarinus"], ["Peace Lily", "Spathiphyllum wallisii"], ["Polka Dot Begonia", "Begonia maculata"],
    ["Anthurium Clarinervium", "Anthurium clarinervium"], ["Jade Plant", "Crassula ovata"], ["Calathea Medallion", "Goeppertia roseopicta"],
    ["Golden Pothos", "Epipremnum aureum"]
  ];
  $$("[data-ticker]").forEach(function (row) {
    var half = row.getAttribute("data-ticker") === "0" ? names.slice(0, 11) : names.slice(11);
    var html = half.map(function (n) { return "<span>" + n[0] + " <i>" + n[1] + "</i></span>"; }).join("");
    row.innerHTML = html + html; // doubled so the drift loops seamlessly
  });
})();
