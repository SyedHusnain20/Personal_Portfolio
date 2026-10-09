"use client";

import { useEffect } from "react";

/* Everything that animates or reacts to scrolling on the public page, ported from the
   original static site: WebGL plus-grid background, GSAP entrances and scroll effects,
   magnetic buttons and the marquee play/pause toggle. Header.tsx owns the theme toggle,
   scroll state, scrollspy and mobile menu; NainiChat.tsx owns the chatbot.

   The server-rendered markup (see components/sections.tsx) is the source of truth, and this
   component only decorates it, so the page is fully readable before this code loads. */

type Theme = "light" | "dark";

const PALETTES: Record<Theme, { ink: number[]; accent: number[]; base: number; glow: number }> = {
  light: { ink: [0.42, 0.4, 0.36], accent: [0.76, 0.25, 0.05], base: 0.15, glow: 0.42 },
  dark: { ink: [0.72, 0.69, 0.62], accent: [1.0, 0.64, 0.42], base: 0.13, glow: 1.0 },
};

const VERT = `attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_dpr;
uniform vec3 u_ink;
uniform vec3 u_accent;
uniform float u_base;
uniform float u_glowmax;
uniform float u_static;

float band(float d, float halfw) {
  return 1.0 - smoothstep(halfw - 0.7, halfw + 0.7, d);
}

void main() {
  float cell = 26.0 * u_dpr;
  vec2 gv = mod(gl_FragCoord.xy, cell) - cell * 0.5;
  vec2 id = floor(gl_FragCoord.xy / cell);

  float h1 = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float h2 = fract(sin(dot(id, vec2(39.3468, 11.1353))) * 24634.6345);
  float scale = 0.85 + 0.35 * h2;

  float mask = 0.0;
  if (h1 < 0.68) {
    float arm = 3.0 * u_dpr * scale;
    float th = 0.8 * u_dpr;
    float a = band(abs(gv.y), th) * band(abs(gv.x), arm);
    float b = band(abs(gv.x), th) * band(abs(gv.y), arm);
    mask = max(a, b);
  } else if (h1 < 0.9) {
    mask = band(length(gv), 1.15 * u_dpr * scale);
  } else {
    float dia = abs(gv.x) + abs(gv.y);
    mask = band(abs(dia - 2.7 * u_dpr * scale), 0.7 * u_dpr);
  }
  if (mask < 0.01) { discard; }

  float d = distance(gl_FragCoord.xy, u_mouse);
  float glow = 1.0 - smoothstep(0.0, 270.0 * u_dpr, d);
  glow = glow * glow * (1.6 - 0.6 * glow);
  glow *= (1.0 - u_static);

  float shimmer = mix(1.0, 0.78 + 0.22 * sin(u_time * 0.5 + h1 * 6.2831), 1.0 - u_static);

  float alpha = mask * (u_base * shimmer + glow * u_glowmax);
  vec3 col = mix(u_ink, u_accent, min(1.0, glow * 1.15));
  gl_FragColor = vec4(col, alpha);
}`;

const currentTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

/** WebGL "plus grid" that glows around the pointer. Returns a cleanup function. */
function initShader(signal: AbortSignal, reduced: boolean): () => void {
  const canvas = document.getElementById("bg") as HTMLCanvasElement | null;
  if (!canvas) return () => {};
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) {
    document.body.classList.add("no-webgl");
    return () => {};
  }

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) {
    document.body.classList.add("no-webgl");
    return () => {};
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    document.body.classList.add("no-webgl");
    return () => {};
  }
  gl.useProgram(prog);

  // One oversized triangle covers the whole viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const U = {
    mouse: gl.getUniformLocation(prog, "u_mouse"),
    time: gl.getUniformLocation(prog, "u_time"),
    dpr: gl.getUniformLocation(prog, "u_dpr"),
    ink: gl.getUniformLocation(prog, "u_ink"),
    accent: gl.getUniformLocation(prog, "u_accent"),
    base: gl.getUniformLocation(prog, "u_base"),
    glowmax: gl.getUniformLocation(prog, "u_glowmax"),
    isStatic: gl.getUniformLocation(prog, "u_static"),
  };

  let dpr = 1;
  let W = 0;
  let H = 0;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  const setPalette = (theme: Theme) => {
    const p = PALETTES[theme];
    gl.uniform3fv(U.ink, p.ink);
    gl.uniform3fv(U.accent, p.accent);
    gl.uniform1f(U.base, p.base);
    gl.uniform1f(U.glowmax, p.glow);
  };
  setPalette(currentTheme());
  gl.uniform1f(U.isStatic, reduced ? 1 : 0);

  let mx = W * 0.6;
  let my = H * 0.3;
  let tx = mx;
  let ty = my;
  let hasPointer = false;
  const start = performance.now();

  const draw = (now: number) => {
    const t = (now - start) / 1000;
    if (!hasPointer) {
      tx = W * (0.5 + 0.38 * Math.sin(t * 0.21));
      ty = H * (0.42 + 0.3 * Math.cos(t * 0.16));
    }
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.mouse, mx * dpr, canvas.height - my * dpr);
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.dpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let raf = 0;
  let running = true;
  let disposed = false;
  const frame = (now: number) => {
    raf = 0;
    if (disposed || !running) return;
    draw(now);
    raf = requestAnimationFrame(frame);
  };

  window.addEventListener(
    "resize",
    () => {
      resize();
      if (reduced) draw(performance.now());
    },
    { passive: true, signal },
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      hasPointer = true;
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true, signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      running = !document.hidden;
      if (running && !reduced && !raf) raf = requestAnimationFrame(frame);
    },
    { signal },
  );

  // Header.tsx calls this when the theme is toggled.
  window.__setShaderTheme = (theme) => {
    setPalette(theme === "dark" ? "dark" : "light");
    if (reduced) draw(performance.now());
  };

  if (reduced) draw(performance.now());
  else raf = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    window.__setShaderTheme = undefined;
  };
}

export default function Effects() {
  useEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    let marqueeTween: { paused: (value: boolean) => unknown } | null = null;

    const stopShader = initShader(signal, reduced);

    /* Marquee play / pause */
    const marquee = document.querySelector<HTMLElement>(".marquee");
    const toggle = document.querySelector<HTMLButtonElement>(".marquee-toggle");
    toggle?.addEventListener(
      "click",
      () => {
        if (!marquee) return;
        const paused = marquee.classList.toggle("paused");
        toggle.setAttribute("aria-pressed", String(paused));
        toggle.setAttribute("aria-label", paused ? "Play skills ticker" : "Pause skills ticker");
        marqueeTween?.paused(paused);
      },
      { signal },
    );

    if (!reduced) {
      (async () => {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          /* Hero entrance */
          gsap
            .timeline({ defaults: { ease: "power3.out" } })
            .from(".availability", { y: 14, opacity: 0, duration: 0.6 })
            .from("#hero-title", { y: 30, opacity: 0, duration: 0.9 }, "-=0.3")
            .from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.55")
            .from(".hero-actions", { y: 16, opacity: 0, duration: 0.6 }, "-=0.45")
            .from(".hero-email", { opacity: 0, duration: 0.5 }, "-=0.35")
            .from(".hero-proof > *", { y: 14, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=0.3")
            .from(".portrait-card", { y: 28, opacity: 0, scale: 0.97, duration: 1 }, 0.15)
            .from(".marquee", { opacity: 0, duration: 0.8 }, "-=0.5");

          /* Scroll reveals */
          gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
            gsap.from(el, {
              y: 26,
              opacity: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
              onComplete: () => {
                gsap.set(el, { clearProps: "transform,opacity" });
              },
            });
          });

          /* Manifesto: words light up as you scroll */
          document.querySelectorAll<HTMLElement>(".manifesto-line").forEach((line) => {
            const words = line.querySelectorAll(".w");
            if (!words.length) return;
            gsap.set(words, { opacity: 0.5 });
            gsap.to(words, {
              opacity: 1,
              stagger: 0.05,
              ease: "none",
              scrollTrigger: { trigger: line, start: "top 88%", end: "top 52%", scrub: 0.6 },
            });
          });

          /* Portrait parallax (desktop only) */
          const portrait = document.getElementById("portraitImg");
          if (portrait && window.matchMedia("(min-width: 641px)").matches) {
            gsap.fromTo(
              portrait,
              { yPercent: -4 },
              {
                yPercent: 4,
                ease: "none",
                scrollTrigger: { trigger: ".portrait-card", start: "top bottom", end: "bottom top", scrub: true },
              },
            );
          }

          /* Count-up stats */
          document.querySelectorAll<HTMLElement>(".count").forEach((el) => {
            const target = parseInt(el.dataset.target ?? "", 10);
            if (Number.isNaN(target)) return;
            const suffix = el.dataset.suffix ?? "";
            const counter = { val: 0 };
            ScrollTrigger.create({
              trigger: el,
              start: "top 92%",
              once: true,
              onEnter: () => {
                gsap.to(counter, {
                  val: target,
                  duration: 1.4,
                  ease: "power2.out",
                  onUpdate: () => {
                    el.textContent = Math.round(counter.val) + suffix;
                  },
                });
              },
            });
          });

          /* Contact panel entrance */
          gsap.from("#contactPanel", {
            scale: 0.965,
            ease: "power2.out",
            duration: 1,
            scrollTrigger: { trigger: "#contactPanel", start: "top 85%", once: true },
          });

          /* Scroll progress bar */
          gsap.to(".scroll-progress", {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
          });

          /* Marquee: GSAP drives it so it can speed up with scroll velocity */
          const track = document.querySelector<HTMLElement>(".marquee-track");
          if (track) {
            track.classList.add("gsap-run");
            const tween = gsap.to(track, { xPercent: -50, ease: "none", duration: 42, repeat: -1 });
            marqueeTween = tween;
            if (marquee?.classList.contains("paused")) tween.paused(true);
            ScrollTrigger.create({
              onUpdate: (self) => {
                const boost = gsap.utils.clamp(1, 4, 1 + Math.abs(self.getVelocity()) / 900);
                tween.timeScale(boost);
                gsap.to(tween, { timeScale: 1, duration: 0.9, ease: "power2.out", overwrite: true });
              },
            });
          }

          /* Certificate seal turns as you scroll past */
          gsap.to(".cert-seal svg", {
            rotation: 360,
            ease: "none",
            scrollTrigger: { trigger: "#certifications", start: "top bottom", end: "bottom top", scrub: 1 },
          });

          /* Footer watermark drifts up as it enters */
          gsap.fromTo(
            ".footer-watermark",
            { yPercent: 34 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true },
            },
          );

          /* Magnetic buttons (mouse only) */
          if (!window.matchMedia("(pointer: coarse)").matches) {
            document.querySelectorAll<HTMLElement>(".magnetic").forEach((el) => {
              el.addEventListener(
                "pointermove",
                (e) => {
                  const r = el.getBoundingClientRect();
                  gsap.to(el, {
                    x: (e.clientX - r.left - r.width / 2) * 0.18,
                    y: (e.clientY - r.top - r.height / 2) * 0.24,
                    duration: 0.4,
                    ease: "power2.out",
                  });
                },
                { signal },
              );
              el.addEventListener(
                "pointerleave",
                () => gsap.to(el, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.55)" }),
                { signal },
              );
            });
          }
        });

        // Late-loading images shift the layout; recompute trigger positions once everything is in.
        window.addEventListener("load", () => ScrollTrigger.refresh(), { signal });
      })();
    }

    return () => {
      cancelled = true;
      abort.abort();
      stopShader();
      ctx?.revert();
    };
  }, []);

  return null;
}
