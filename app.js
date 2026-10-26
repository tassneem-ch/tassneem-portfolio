/* ============================================================
   Tasnim Cherif — sakura morning interactions
   Zero dependencies. One rAF canvas loop + IntersectionObservers.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    // close after choosing a link
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- scroll reveals ---------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- timeline line draw ---------- */
  var timeline = document.querySelector(".timeline");
  if (timeline) {
    if ("IntersectionObserver" in window && !reduced) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            tio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      tio.observe(timeline);
    } else {
      timeline.classList.add("in");
    }
  }

  /* ============================================================
     CHERRY BLOSSOM PETALS
     25–35 petals, 5-petal flower shapes, sinusoidal sway,
     occasional gusts, fade + recycle. One rAF loop, no libraries.
     ============================================================ */
  if (reduced) return;

  var canvas = document.getElementById("petals");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var petals = [];
  var gust = { active: false, t: 0, next: 6000 + Math.random() * 8000, power: 0 };
  var running = true;
  var lastTime = 0;

  var COLORS = ["#F8C8DA", "#FBD9E4", "#FDEFF4"];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function rand(a, b) { return a + Math.random() * (b - a); }

  function Petal(atTop) {
    this.reset(atTop);
  }
  Petal.prototype.reset = function (atTop) {
    this.x = rand(-40, W + 40);
    this.y = atTop ? rand(-60, -10) : rand(-H, H);
    this.size = rand(8, 20);
    this.speedY = rand(22, 55) / 1000;          // px per ms
    this.swayAmp = rand(14, 42);
    this.swayFreq = rand(0.6, 1.6);
    this.phase = rand(0, Math.PI * 2);
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-0.6, 0.6) / 1000;     // rad per ms
    this.color = COLORS[(Math.random() * COLORS.length) | 0];
    this.alpha = rand(0.5, 0.85);   // kept ≤.85 so petals over text stay legible
    this.gustVX = 0;
  };

  // one 5-petal blossom drawn with rotated teardrops
  Petal.prototype.draw = function () {
    var s = this.size;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    for (var i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.55, -s * 0.45, 0, -s);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.45, 0, 0);
      ctx.fill();
    }
    // tiny center
    ctx.globalAlpha = this.alpha * 0.9;
    ctx.fillStyle = "#FBE8C8";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // petal count scales with viewport, capped 25–35 per the spec
  function petalCount() {
    return Math.max(25, Math.min(35, Math.round((W * H) / 42000)));
  }

  function spawn() {
    petals = [];
    var n = petalCount();
    for (var i = 0; i < n; i++) petals.push(new Petal(false));
  }
  spawn();
  window.addEventListener("resize", function () {
    var want = petalCount();
    while (petals.length < want) petals.push(new Petal(false));
    while (petals.length > want) petals.pop();
  });

  function frame(now) {
    if (!running) return;
    var dt = lastTime ? Math.min(now - lastTime, 50) : 16;
    lastTime = now;

    ctx.clearRect(0, 0, W, H);

    /* --- gust logic: every 6–14s, a burst sweeps across --- */
    gust.next -= dt;
    if (!gust.active && gust.next <= 0) {
      gust.active = true;
      gust.t = 1800 + Math.random() * 1400;
      gust.power = rand(55, 120);
      // give a subset of petals the sweep
      var kick = 5 + ((Math.random() * 5) | 0);
      for (var k = 0; k < kick; k++) {
        petals[(Math.random() * petals.length) | 0].gustVX = gust.power * (Math.random() > 0.3 ? 1 : -0.6);
      }
    }
    if (gust.active) {
      gust.t -= dt;
      if (gust.t <= 0) {
        gust.active = false;
        gust.next = 6000 + Math.random() * 8000;
      }
    }

    /* --- update + draw --- */
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];

      p.phase += (p.swayFreq * Math.PI * 2 * dt) / 1000;
      var sway = Math.sin(p.phase) * p.swayAmp;

      p.y += p.speedY * dt;
      p.x += sway * (dt / 1000) * 0.35 + p.gustVX * (dt / 1000);
      p.rot += p.rotSpeed * dt;

      // decay gust
      if (p.gustVX !== 0) {
        p.gustVX *= 1 - dt / 1400;
        if (Math.abs(p.gustVX) < 2) p.gustVX = 0;
      }

      // fade out near the bottom
      var fadeZone = H * 0.82;
      if (p.y > fadeZone) {
        p.alpha = Math.max(0, p.alpha - dt / 900);
      }

      // recycle seamlessly
      if (p.y > H + 30 || p.alpha <= 0.02 || p.x < -80 || p.x > W + 80) {
        p.reset(true);
        continue;
      }

      p.draw();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* pause when tab hidden (saves battery + keeps timing sane) */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      lastTime = 0;
      requestAnimationFrame(frame);
    }
  });
})();

/* ============================================================
   STORY PATHS — choose a path, switch narratives,
   expand project details. Tablist semantics + arrow keys.
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".path-card[role=tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".path-panel"));
  var chooser = document.querySelector(".path-chooser");
  if (!tabs.length || !panels.length) return;

  function activate(id, moveFocus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-path") === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
      if (on && moveFocus) t.focus();
    });
    panels.forEach(function (p) {
      var on = p.id === "path-" + id;
      p.classList.toggle("is-active", on);
      if (on) {
        // reveal children right away — the scroll observer can't be
        // trusted for very tall or just-shown panels
        Array.prototype.forEach.call(p.querySelectorAll("[data-reveal]"), function (el) {
          el.classList.add("in");
        });
        p.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }
    });
  }

  tabs.forEach(function (t, i) { t.setAttribute("tabindex", i === 0 ? "0" : "-1"); });

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { activate(t.getAttribute("data-path"), false); });
    t.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(t), n = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); activate(tabs[n].getAttribute("data-path"), true); }
    });
  });

  document.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    if (next) { activate(next.getAttribute("data-next"), false); return; }
    var back = e.target.closest("[data-paths-back]");
    if (back && chooser) {
      chooser.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      var sel = document.querySelector('.path-card[aria-selected="true"]') || tabs[0];
      sel.focus();
      return;
    }
    var more = e.target.closest(".story__more");
    if (more) {
      var open = more.getAttribute("aria-expanded") === "true";
      more.setAttribute("aria-expanded", open ? "false" : "true");
      more.textContent = open ? "The full story ↓" : "Close the story ↑";
      var detail = document.getElementById(more.getAttribute("aria-controls"));
      if (detail) detail.hidden = open;
    }
  });
})();
