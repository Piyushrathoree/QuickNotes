"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { AndroidIcon, Download04Icon, GithubIcon } from "@hugeicons/core-free-icons";

import { LogoMark } from "@/components/brand/LogoMark";
import { AppMock } from "@/components/home/AppMock";
import { GetAppButton } from "@/components/home/GetAppButton";
import { PhoneMock } from "@/components/home/PhoneMock";
import { TryPad } from "@/components/home/TryPad";
import { Icon } from "@/components/Icon";

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, useGSAP);

interface LandingProps {
  apkUrl: string | null;
  mcpUrl: string;
  repoUrl: string;
}

/** The note that types itself in the pinned scene: raw Markdown, then what the notepad shows. */
const typingLines: { raw: string; kind: "h" | "todo" | "done" | "bold" | "ol" | "code" | "quote"; text: string }[] = [
  { raw: "# Weekend in Lisbon", kind: "h", text: "Weekend in Lisbon" },
  { raw: "- [ ] book the 7:40 train", kind: "todo", text: "book the 7:40 train" },
  { raw: "- [x] find the old film camera", kind: "done", text: "find the old film camera" },
  { raw: "1. pastéis de nata in Belém", kind: "ol", text: "pastéis de nata in Belém" },
  { raw: "**Pack light.** two shirts, one jacket", kind: "bold", text: "two shirts, one jacket" },
  { raw: "> the charger. always the charger.", kind: "quote", text: "the charger. always the charger." },
  { raw: "`tickets.pdf` is in downloads", kind: "code", text: "is in downloads" },
];

const marqueeWords = ["Notes", "Lists", "Checklists", "Tables", "Code", "Links", "Drafts", "Ideas"];
const marqueeHand = ["write it down", "tick it off", "paste it in", "share the link", "keep it forever"];
const fonts = [
  { name: "Hand", family: "var(--font-patrick-hand)" },
  { name: "Sans", family: "var(--font-plex-sans)" },
  { name: "Serif", family: "var(--font-plex-serif)" },
  { name: "Mono", family: "var(--font-plex-mono)" },
];

export function Landing({ apkUrl, mcpUrl, repoUrl }: LandingProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // A reload anywhere on the page starts at the hero. Restoring a mid-page position would start the pinned
      // scenes half-built, so the browser's scroll memory is off while this page is open.
      const previousRestoration = history.scrollRestoration;
      history.scrollRestoration = "manual";
      if (!window.location.hash) window.scrollTo(0, 0);

      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          wide: "(min-width: 900px)",
        },
        (context) => {
          const { motion, wide } = context.conditions as { motion: boolean; wide: boolean };
          if (!motion) return;

          // ---- Smooth scroll, driven by GSAP's ticker so ScrollTrigger and Lenis agree on every frame ----
          const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
          lenis.on("scroll", ScrollTrigger.update);
          const raf = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);

          // In-page links go through Lenis too, so they glide instead of jumping.
          const anchors = gsap.utils.toArray<HTMLAnchorElement>('a[href^="#"]');
          const onAnchor = (event: Event) => {
            const href = (event.currentTarget as HTMLAnchorElement).getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target as HTMLElement, { offset: 0, duration: 1.4 });
          };
          anchors.forEach((anchor) => anchor.addEventListener("click", onAnchor));

          // ---- Header: slides away while reading down, comes back when scrolling up ----
          const header = root.current?.querySelector<HTMLElement>(".lx-header");
          const headerTrigger = ScrollTrigger.create({
            start: 120,
            onUpdate: (self) => {
              if (!header) return;
              gsap.to(header, { yPercent: self.direction === 1 ? -110 : 0, duration: 0.45, ease: "power3.out", overwrite: true });
            },
          });

          // ---- 1. Loader: a counter, a pen stroke, then the sheet lifts ----
          const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
          const counter = { value: 0 };
          const countEl = root.current?.querySelector<HTMLElement>("[data-count]");
          intro
            .to(counter, {
              value: 100,
              duration: 1.5,
              ease: "power2.inOut",
              onUpdate: () => {
                if (countEl) countEl.textContent = String(Math.round(counter.value)).padStart(3, "0");
              },
            })
            .fromTo(".lx-loader-stroke", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 0)
            .from(".lx-loader-word", { yPercent: 110, duration: 1, ease: "expo.out" }, 0.15)
            .to(".lx-loader-word, .lx-loader-count", { yPercent: -110, duration: 0.6, ease: "power3.in" }, 1.55)
            .to(".lx-loader", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, 1.75)
            .set(".lx-loader", { display: "none" });

          // ---- 2. Hero arrives under the lifting sheet ----
          const title = SplitText.create(".lx-title", { type: "lines,chars", mask: "lines", linesClass: "lx-title-line" });
          const scribble = SplitText.create(".lx-scribble-text", { type: "chars" });
          gsap.set(".lx-title", { autoAlpha: 1 });
          intro
            .from(".lx-rule", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.4, stagger: 0.045, ease: "expo.inOut" }, 2.05)
            .from(".lx-margin-line", { scaleY: 0, transformOrigin: "50% 0%", duration: 1.4, ease: "expo.inOut" }, 2.1)
            .from(title.chars, { yPercent: 115, duration: 1.3, stagger: 0.03 }, 2.15)
            .from(scribble.chars, { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.022, ease: "back.out(2)" }, 2.75)
            .fromTo(".lx-scribble-arrow path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 3)
            .from(".lx-hero-copy .lx-lede, .lx-hero-copy .lx-actions", { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08 }, 2.5)
            .from(".lx-shot", { autoAlpha: 0, yPercent: 16, duration: 1.7, ease: "expo.out" }, 2.55)
            .from(".lx-header", { yPercent: -120, duration: 1 }, 2.5)
            // Inside the product window: a box ticks itself, then a new line is written.
            .add(() => root.current?.querySelector(".am-tick")?.classList.add("is-on"), 4.2)
            .fromTo(".am-type-text", { text: "" }, { text: { value: "• call grandma on Sunday" }, duration: 1.7, ease: "none" }, 4.6);

          // Scrolling: the window flattens out of its slight perspective, and the ruled lines fade.
          gsap.fromTo(
            ".lx-shot",
            { rotateX: 14, scale: 0.95 },
            { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".lx-shot-stage", start: "top 92%", end: "top 18%", scrub: 0.8 } },
          );
          gsap.to(".lx-rules", { autoAlpha: 0, ease: "none", scrollTrigger: { trigger: ".lx-hero", start: "top top", end: "45% top", scrub: true } });

          // ---- 3. Marquee: loops forever, speeds up and skews with the scroll ----
          const rows = gsap.utils.toArray<HTMLElement>(".lx-mq-track");
          const loops = rows.map((track, i) =>
            gsap.to(track, { xPercent: i % 2 ? 50 : -50, ease: "none", duration: i % 2 ? 38 : 30, repeat: -1 }).totalProgress(i % 2 ? 0.5 : 0),
          );
          rows.forEach((track, i) => {
            if (i % 2) gsap.set(track, { xPercent: -50 });
          });
          const skew = gsap.quickTo(".lx-mq-row", "skewX", { duration: 0.6, ease: "power3.out" });
          ScrollTrigger.create({
            trigger: ".lx-marquee",
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              const velocity = self.getVelocity();
              const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(velocity) / 400);
              loops.forEach((loop) => gsap.to(loop, { timeScale: boost * self.direction, duration: 0.3, overwrite: true }));
              skew(gsap.utils.clamp(-12, 12, velocity / -120));
            },
          });

          // ---- 4. Pinned: the note types itself as you scroll, and the Markdown turns into formatting ----
          const lineEls = gsap.utils.toArray<HTMLElement>(".lx-tl");
          const lengths = typingLines.map((line) => line.raw.length);
          const total = lengths.reduce((sum, n) => sum + n, 0);
          const caret = root.current?.querySelector<HTMLElement>(".lx-caret");
          let lastTyped = -1;
          const renderTyping = (progress: number) => {
            const typed = Math.round(progress * total);
            if (typed === lastTyped) return;
            lastTyped = typed;
            let offset = 0;
            lineEls.forEach((el, i) => {
              const len = lengths[i];
              const raw = el.querySelector<HTMLElement>(".lx-tl-raw");
              const local = typed - offset;
              if (local >= len) {
                el.dataset.state = "done";
              } else if (local > 0) {
                el.dataset.state = "typing";
                if (raw) raw.textContent = typingLines[i].raw.slice(0, local);
                if (caret && raw && caret.parentElement !== raw.parentElement) raw.after(caret);
              } else {
                el.dataset.state = "idle";
                if (raw) raw.textContent = "";
              }
              offset += len;
            });
            if (caret) caret.style.visibility = typed === 0 || typed >= total ? "hidden" : "visible";
          };
          renderTyping(0);
          const typeWords = SplitText.create(".lx-type-title", { type: "words" });
          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".lx-type",
                start: "top top",
                end: () => `+=${window.innerHeight * (wide ? 2.6 : 2.2)}`,
                pin: true,
                scrub: 0.6,
                onUpdate: (self) => renderTyping(gsap.utils.clamp(0, 1, (self.progress - 0.12) / 0.8)),
              },
            })
            .from(typeWords.words, { autoAlpha: 0.12, stagger: 0.05, duration: 0.3, ease: "none" }, 0)
            .from(".lx-paper-sheet", { rotate: 0, x: 0, y: 0, duration: 0.4, ease: "power2.out" }, 0)
            .to(".lx-type-progress span", { scaleX: 1, ease: "none", duration: 1 }, 0);

          // ---- 5. Horizontal strip of features ----
          const track = root.current?.querySelector<HTMLElement>(".lx-strip-track");
          let strip: gsap.core.Tween | undefined;
          if (wide && track) {
            strip = gsap.to(track, {
              x: () => -(track.scrollWidth - window.innerWidth),
              ease: "none",
              scrollTrigger: {
                trigger: ".lx-strip",
                start: "top top",
                end: () => `+=${track.scrollWidth - window.innerWidth}`,
                pin: true,
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
          }
          // Each panel's own moment, keyed to when it slides into view (sideways on wide screens, down on phones).
          const panelTrigger = (selector: string) =>
            strip
              ? { trigger: selector, containerAnimation: strip, start: "left 70%", toggleActions: "play none none reverse" }
              : { trigger: selector, start: "top 75%", toggleActions: "play none none reverse" };

          // Paste: tied to the scroll itself. The junk sits on the page as the panel arrives, is swept off as you
          // keep going, and comes back when you scroll back.
          const junkFlight = [
            { x: -240, y: -170, rotate: -38 },
            { x: 260, y: -150, rotate: 42 },
            { x: -280, y: 120, rotate: -24 },
            { x: 250, y: 190, rotate: 30 },
            { x: 300, y: -20, rotate: 55 },
            { x: -60, y: -230, rotate: -50 },
          ];
          gsap
            .timeline({
              scrollTrigger: strip
                ? { trigger: ".lx-panel-paste", containerAnimation: strip, start: "left 35%", end: "left -25%", scrub: 0.6 }
                : { trigger: ".lx-panel-paste", start: "top 55%", end: "top 5%", scrub: 0.6 },
            })
            .to(".lx-junk", {
              x: (i) => junkFlight[i % junkFlight.length].x,
              y: (i) => junkFlight[i % junkFlight.length].y,
              rotate: (i) => junkFlight[i % junkFlight.length].rotate,
              autoAlpha: 0,
              duration: 0.7,
              stagger: 0.05,
              ease: "power2.in",
            })
            .fromTo(".lx-clean", { autoAlpha: 0.25, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }, 0.35)
            .from(".lx-clean > *", { autoAlpha: 0, x: -24, stagger: 0.06, duration: 0.4, ease: "power2.out" }, 0.45);

          gsap
            .timeline({ scrollTrigger: panelTrigger(".lx-panel-table") })
            .from(".lx-grid-cell", { scale: 0, autoAlpha: 0, duration: 0.5, stagger: { each: 0.05, from: "start", grid: "auto" }, ease: "back.out(2)" })
            .from(".lx-grid-head", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.7, ease: "expo.out" }, 0.1);

          // Fonts: the same word in four hands, swapped like a split-flap board.
          const faces = gsap.utils.toArray<HTMLElement>(".lx-face");
          const faceNames = gsap.utils.toArray<HTMLElement>(".lx-face-name");
          const fontLoop = gsap.timeline({ repeat: -1, paused: true });
          faces.forEach((face, i) => {
            const next = faces[(i + 1) % faces.length];
            fontLoop
              .to(face, { yPercent: -105, duration: 0.7, ease: "expo.inOut" }, i * 1.4 + 1)
              .fromTo(next, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: "expo.inOut", immediateRender: false }, i * 1.4 + 1)
              .to(faceNames[i], { autoAlpha: 0, duration: 0.2 }, i * 1.4 + 1)
              .to(faceNames[(i + 1) % faces.length], { autoAlpha: 1, duration: 0.3 }, i * 1.4 + 1.4);
          });
          // Start state, set after the loop is built so none of its tweens can overwrite it.
          gsap.set(faces, { yPercent: (i) => (i === 0 ? 0 : 105) });
          gsap.set(faceNames, { autoAlpha: (i) => (i === 0 ? 1 : 0) });
          // The font loop only runs while its panel is on screen.
          ScrollTrigger.create({
            trigger: ".lx-panel-fonts",
            ...(strip ? { containerAnimation: strip, start: "left 85%", end: "right 15%" } : { start: "top 85%", end: "bottom 15%" }),
            onToggle: (self) => (self.isActive ? fontLoop.play() : fontLoop.pause()),
          });

          gsap
            .timeline({ scrollTrigger: panelTrigger(".lx-panel-share") })
            .from(".lx-link-chip", { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: "back.out(1.8)" })
            .fromTo(".lx-slug", { text: "" }, { text: { value: "Ib_BP-_Im0zW40JN6QRQbw" }, duration: 1.1, ease: "none" }, "-=0.2")
            .from(".lx-toast", { y: 30, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" }, "+=0.1");

          gsap
            .timeline({ scrollTrigger: panelTrigger(".lx-panel-ai") })
            .fromTo(".lx-term-cmd", { text: "" }, { text: { value: "save a note: “ideas from the call”" }, duration: 1.2, ease: "none" })
            .from(".lx-term-out", { autoAlpha: 0, y: 10, stagger: 0.25, duration: 0.4 }, "+=0.15");

          // ---- 6. The phone rises a little, and the list gets ticked off as you read ----
          gsap
            .timeline({ scrollTrigger: { trigger: ".lx-phone-scene", start: "top 85%", end: "center 55%", scrub: 0.8 } })
            .fromTo(".lx-device", { yPercent: 12, rotateX: 8, scale: 0.95 }, { yPercent: 0, rotateX: 0, scale: 1, ease: "power2.out" }, 0)
            .from(".lx-phone-copy > *", { autoAlpha: 0, y: 28, stagger: 0.08, ease: "power2.out" }, 0);
          const phoneTasks = gsap.utils.toArray<HTMLElement>(".lx-mtask");
          ScrollTrigger.create({
            trigger: ".lx-phone-scene",
            start: "top 45%",
            end: "bottom 70%",
            onUpdate: (self) => {
              const done = Math.floor(self.progress * (phoneTasks.length + 0.6));
              phoneTasks.forEach((task, i) => task.classList.toggle("is-done", i < done));
            },
          });

          // ---- 7. Ending: the giant words fill with ink as they come up ----
          gsap.utils.toArray<HTMLElement>(".lx-end-fill").forEach((fill) => {
            gsap.fromTo(
              fill,
              { clipPath: "inset(-25% 100% -25% 0%)" },
              { clipPath: "inset(-25% 0% -25% 0%)", ease: "none", scrollTrigger: { trigger: fill, start: "top 85%", end: "top 35%", scrub: 0.8 } },
            );
          });
          gsap.from(".lx-try", {
            autoAlpha: 0,
            y: 60,
            rotate: -2,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: ".lx-try", start: "top 85%" },
          });

          // Section headings rise line by line the first time they enter.
          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
            const split = SplitText.create(el, { type: "lines", mask: "lines" });
            gsap.from(split.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.08,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 85%" },
            });
          });

          // Fonts settle after first paint; measure everything again once they have.
          document.fonts?.ready.then(() => ScrollTrigger.refresh());

          return () => {
            anchors.forEach((anchor) => anchor.removeEventListener("click", onAnchor));
            headerTrigger.kill();
            gsap.ticker.remove(raf);
            lenis.destroy();
            title.revert();
            scribble.revert();
            typeWords.revert();
          };
        },
      );
      return () => {
        history.scrollRestoration = previousRestoration;
      };
    },
    { scope: root },
  );

  return (
    <div className="lx-page" ref={root}>
      {/* Turns motion on before first paint, so nothing flashes in its final place before animating. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "if(window.matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.classList.add('lx-motion')",
        }}
      />

      <div className="lx-loader" aria-hidden="true">
        <div className="lx-loader-mask">
          <span className="lx-loader-word">Quick Notes</span>
        </div>
        <svg className="lx-loader-pen" viewBox="0 0 600 80" fill="none">
          <path
            className="lx-loader-stroke"
            pathLength={1}
            d="M6 52c40-30 70-34 92-10s40 26 66 2 52-30 82-6 50 22 80 0 56-28 88-4 54 20 84-2 52-18 96 2"
          />
        </svg>
        <div className="lx-loader-mask lx-loader-count-wrap">
          <span className="lx-loader-count" data-count>
            000
          </span>
        </div>
      </div>


      <a className="lx-skip" href="#main">
        Skip to content
      </a>

      <header className="lx-header">
        <Link className="lx-brand" href="/">
          <LogoMark size={30} tile="var(--logo-tile)" />
          <span>Quick Notes</span>
        </Link>
        <nav className="lx-nav" aria-label="Main">
          <a href="#features" className="lx-nav-link">
            Features
          </a>
          <GetAppButton apkUrl={apkUrl} className="lx-nav-link">
            Android app
          </GetAppButton>
          <Link href="/login" className="lx-nav-link">
            Sign in
          </Link>
          <Link href="/write" className="lx-btn lx-btn-solid lx-nav-cta">
            Open the notepad
          </Link>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        {/* ---------------- Hero ---------------- */}
        <section className="lx-hero" aria-labelledby="lx-title">
          <div className="lx-rules" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="lx-rule" />
            ))}
            <span className="lx-margin-line" />
          </div>

          <div className="lx-hero-copy">
            <h1 className="lx-title" id="lx-title">
              Write it down.
            </h1>
            <p className="lx-scribble" aria-hidden="true">
              <svg className="lx-scribble-arrow" viewBox="0 0 120 90" fill="none">
                <path pathLength={1} d="M8 10c34 6 62 22 78 52m0 0-2-20m2 20-18-8" />
              </svg>
              <span className="lx-scribble-text">before it slips away</span>
            </p>
            <p className="lx-lede">
              A free notepad that opens straight to a blank page. No sign-up. Markdown formats as you type, notes save in
              your browser, and a free account keeps them on every device.
            </p>
            <div className="lx-actions">
              <Link href="/write" className="lx-btn lx-btn-solid lx-btn-big">
                Open the notepad
              </Link>
              <GetAppButton apkUrl={apkUrl} className="lx-btn lx-btn-line lx-btn-big">
                <Icon icon={AndroidIcon} />
                {apkUrl ? "Download for Android" : "Android app"}
              </GetAppButton>
            </div>
          </div>

          <div className="lx-shot-stage">
            <div className="lx-shot" role="img" aria-label="The Quick Notes notepad: a list of notes on the left and a ruled page with a checklist on the right">
              <AppMock />
            </div>
          </div>
        </section>

        {/* ---------------- Marquee ---------------- */}
        <section className="lx-marquee" aria-label="What goes in a note">
          <div className="lx-mq-row">
            <div className="lx-mq-track">
              {[...marqueeWords, ...marqueeWords].map((word, i) => (
                <span key={i} aria-hidden={i >= marqueeWords.length || undefined}>
                  {word}
                  <i className="lx-mq-dot" />
                </span>
              ))}
            </div>
          </div>
          <div className="lx-mq-row lx-mq-hand" aria-hidden="true">
            <div className="lx-mq-track">
              {[...marqueeHand, ...marqueeHand, ...marqueeHand, ...marqueeHand].map((word, i) => (
                <span key={i}>{word}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Pinned typing scene ---------------- */}
        <section className="lx-type" id="features" aria-labelledby="lx-type-title">
          <div className="lx-type-inner">
            <div className="lx-type-copy">
              <h2 className="lx-type-title" id="lx-type-title">
                Type like you think. The note tidies itself.
              </h2>
              <p>
                Headings, checklists, lists, quotes and code turn into formatting the moment you type them. Underneath
                it’s still plain text, so it opens anywhere.
              </p>
              <div className="lx-type-progress" aria-hidden="true">
                <span />
              </div>
            </div>
            <div className="lx-paper" role="img" aria-label="A note being typed: a heading, a checklist, a numbered item, bold text, a quote and inline code">
              <span className="lx-paper-sheet lx-paper-back2" aria-hidden="true" />
              <span className="lx-paper-sheet lx-paper-back1" aria-hidden="true" />
              <div className="lx-paper-front" aria-hidden="true">
                <span className="lx-paper-holes">
                  <i />
                  <i />
                  <i />
                </span>
                <p className="lx-paper-date">Fri, 14 March</p>
                <div className="lx-type-lines">
                  {typingLines.map((line) => (
                    <p key={line.raw} className={`lx-tl lx-tl-${line.kind}`} data-state="done">
                      <span className="lx-tl-raw">{line.raw}</span>
                      <span className="lx-tl-out">
                        {line.kind === "todo" && <i className="lx-box" />}
                        {line.kind === "done" && <i className="lx-box lx-box-on" />}
                        {line.kind === "ol" && <em className="lx-ol">1.</em>}
                        {line.kind === "bold" && <b>Pack light. </b>}
                        {line.kind === "code" && <code>tickets.pdf</code>}
                        {line.kind === "code" ? ` ${line.text}` : line.text}
                      </span>
                    </p>
                  ))}
                  <span className="lx-caret" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Horizontal feature strip ---------------- */}
        <section className="lx-strip" aria-label="More of what it does">
          <div className="lx-strip-track">
            <article className="lx-panel lx-panel-intro">
              <h2 data-reveal>
                Small app.
                <br />
                Lots of tricks.
              </h2>
              <p className="lx-panel-hint" aria-hidden="true">
                keep scrolling
              </p>
            </article>

            <article className="lx-panel lx-panel-paste">
              <div className="lx-panel-copy">
                <h3>Paste the mess. Keep the note.</h3>
                <p>From Word, Google Docs, a web page or a spreadsheet. Lists and tables come through. The junk doesn’t.</p>
              </div>
              <div className="lx-paste-stage" aria-hidden="true">
                <span className="lx-junk lx-j1">We use cookies 🍪 Accept</span>
                <span className="lx-junk lx-j2">SPONSORED</span>
                <span className="lx-junk lx-j3">·&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span className="lx-junk lx-j4">Share ▸ Tweet ▸ Email</span>
                <span className="lx-junk lx-j5">&lt;o:p&gt;&nbsp;&lt;/o:p&gt;</span>
                <span className="lx-junk lx-j6">font-family: Calibri</span>
                <div className="lx-clean">
                  <p className="lx-clean-h">Trip plan</p>
                  <p>• book the train</p>
                  <p className="lx-clean-in">◦ seats together</p>
                  <p>• pack chargers</p>
                </div>
              </div>
            </article>

            <article className="lx-panel lx-panel-table">
              <div className="lx-panel-copy">
                <h3>Tables that stay tables.</h3>
                <p>Type a row with pipes and press Enter. Tab moves between cells, and the grid renders as you go.</p>
              </div>
              <div className="lx-grid" aria-hidden="true">
                <span className="lx-grid-head" />
                {["Day", "City", "Budget", "Fri", "Porto", "€120", "Sat", "Lisbon", "€95", "Sun", "Sintra", "€60"].map((cell, i) => (
                  <span key={cell} className={`lx-grid-cell${i < 3 ? " lx-grid-th" : ""}`}>
                    {cell}
                  </span>
                ))}
              </div>
            </article>

            <article className="lx-panel lx-panel-fonts">
              <div className="lx-panel-copy">
                <h3>Write in your own hand.</h3>
                <p>Four writing fonts and four text sizes. The ruled lines stay put, whichever you pick.</p>
              </div>
              <div className="lx-faces" aria-hidden="true">
                <div className="lx-face-window">
                  {fonts.map((font) => (
                    <span key={font.name} className="lx-face" style={{ fontFamily: font.family }}>
                      notes
                    </span>
                  ))}
                </div>
                <div className="lx-face-names">
                  {fonts.map((font) => (
                    <span key={font.name} className="lx-face-name">
                      {font.name}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="lx-panel lx-panel-share">
              <div className="lx-panel-copy">
                <h3>Share a page.</h3>
                <p>Turn on a read-only link for any saved note. Turn it off, and the link stops working.</p>
              </div>
              <div className="lx-share" aria-hidden="true">
                <div className="lx-link-chip">
                  quicknotes.site/s/<span className="lx-slug">Ib_BP-_Im0zW40JN6QRQbw</span>
                </div>
                <div className="lx-toast">Link copied</div>
              </div>
            </article>

            <article className="lx-panel lx-panel-ai">
              <div className="lx-panel-copy">
                <h3>Let your AI take notes.</h3>
                <p>Claude, Cursor and other MCP apps can save, search and edit your notes with a token you can revoke.</p>
                <Link href="/mcp" className="lx-text-link">
                  Set up AI access
                </Link>
              </div>
              <div className="lx-term" aria-hidden="true">
                <p className="lx-term-line">
                  <span className="lx-term-you">you</span> <span className="lx-term-cmd">save a note: “ideas from the call”</span>
                </p>
                <p className="lx-term-out">→ create_note · “Ideas from the call”</p>
                <p className="lx-term-out">✓ saved to Quick Notes</p>
                <p className="lx-term-url">{mcpUrl}</p>
              </div>
            </article>
          </div>
        </section>

        {/* ---------------- Phone ---------------- */}
        <section className="lx-phone-scene" id="android" aria-labelledby="lx-android-title" tabIndex={-1}>
          <div className="lx-phone-copy">
            <h2 id="lx-android-title">The same page, in your pocket.</h2>
            <p>
              Quick Notes for Android has the same ruled paper and fonts. It works offline, and your notes sync when you
              sign in.
            </p>
            <GetAppButton apkUrl={apkUrl} className="lx-btn lx-btn-solid lx-btn-big">
              <Icon icon={apkUrl ? Download04Icon : AndroidIcon} />
              {apkUrl ? "Download for Android" : "Get the app"}
            </GetAppButton>
          </div>
          <div className="lx-phone-stage">
            <PhoneMock />
          </div>
        </section>

        {/* ---------------- Ending ---------------- */}
        <section className="lx-end" aria-labelledby="lx-end-title">
          <h2 className="lx-end-title" id="lx-end-title">
            <span className="lx-end-word" data-text="Start">
              Start
              <span className="lx-end-fill" aria-hidden="true">
                Start
              </span>
            </span>
            <span className="lx-end-word" data-text="writing.">
              writing.
              <span className="lx-end-fill" aria-hidden="true">
                writing.
              </span>
            </span>
          </h2>
          <TryPad />
          <Link href="/write" className="lx-btn lx-btn-solid lx-btn-huge">
            Open the notepad
          </Link>
        </section>
      </main>

      <footer className="lx-footer">
        <p>Quick Notes is free and open source under the MIT license.</p>
        <nav aria-label="Footer">
          <Link href="/about">How it works</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/mcp">AI access</Link>
          <a href={repoUrl}>
            <Icon icon={GithubIcon} />
            Source code
          </a>
        </nav>
      </footer>
    </div>
  );
}
