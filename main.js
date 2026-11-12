gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const DESKTOP = "(min-width: 861px) and (prefers-reduced-motion: no-preference)";
const MOBILE = "(max-width: 860px)";
const MOTION = "(prefers-reduced-motion: no-preference)";

/* ---------- Smooth scroll ---------- */
let lenis;
if (window.Lenis && !reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const el = id.length > 1 && $(id);
    if (id.length > 1 && !el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el || 0);
    else window.scrollTo({ top: el ? el.getBoundingClientRect().top + scrollY : 0 });
  })
);

const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: reduce)", () => document.documentElement.classList.remove("intro-pending"));

/* ---------- Intro load animation + hero shrinks into project collage ---------- */
mm.add(MOTION, () => {
  gsap.set(".site-header", { autoAlpha: 0 });
  document.documentElement.classList.remove("intro-pending");
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(".hero-bg", { opacity: 0, scale: 1.18, duration: 2.2, ease: "power3.out" })
    .from(".hero-title .line > span", { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.7)
    .from(".hero-tag .line > span", { yPercent: 110, duration: 1.2, stagger: 0.08 }, 1.0)
    .fromTo(".site-header", { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 1.2, clearProps: "all" }, 1.2);

  gsap.timeline({
    scrollTrigger: { trigger: ".intro", start: "top top", end: "+=95%", scrub: 0.6 },
  })
    .to(".hero", { scale: 0.5, borderRadius: 6, ease: "none" }, 0)
    .to(".collage", { opacity: 1, scale: 1, ease: "none" }, 0);

  /* Generic reveals */
  $$(".reveal").forEach((el) => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });
  gsap.from(".why-item", {
    y: 60, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.12,
    scrollTrigger: { trigger: ".why-grid", start: "top 85%" },
  });
  gsap.from(".footer-card", {
    y: 80, opacity: 0, duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: ".footer", start: "top 70%" },
  });
});

/* ---------- Experiencia: stacked project cards ---------- */
mm.add(DESKTOP, () => {
  const cards = $$(".work-card");
  const items = $$(".work-list li");
  const fill = $(".work-line-fill");

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".work-pin",
      refreshPriority: 2,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate(self) {
        const t = self.progress * tl.duration();
        let idx = 0;
        for (let i = 1; i < cards.length; i++) if (t > (i - 1) * 1.2 + 0.7) idx = i;
        items.forEach((li, i) => {
          li.classList.toggle("active", i === idx);
          li.classList.toggle("passed", i < idx);
        });
        fill.style.height = Math.min(100, self.progress * 115) + "%";
      },
    },
  });
  cards.slice(1).forEach((card, i) => {
    tl.fromTo(card, { yPercent: 101 }, { yPercent: 0, ease: "none", duration: 1 }, i * 1.2 + 0.2);
  });
  tl.to({}, { duration: 0.4 });

  const onClick = items.map((li, i) => () => {
    const st = tl.scrollTrigger;
    const target = i === 0 ? st.start : st.start + (st.end - st.start) * ((i * 1.2 + 1.2) / tl.duration());
    lenis ? lenis.scrollTo(target) : window.scrollTo({ top: target, behavior: "smooth" });
  });
  items.forEach((li, i) => li.addEventListener("click", onClick[i]));
  return () => items.forEach((li, i) => li.removeEventListener("click", onClick[i]));
});

/* ---------- Servicios: horizontal scroll ---------- */
const cards = $$(".card");
let hovered = null;
const setActive = (card) => cards.forEach((c) => c.classList.toggle("active", c === card));
cards.forEach((c) => {
  c.addEventListener("mouseenter", () => { hovered = c; setActive(c); });
  c.addEventListener("mouseleave", () => { hovered = null; pickCenter(); });
});
function pickCenter() {
  if (hovered) return;
  const mid = innerWidth / 2;
  let best = cards[0], d = Infinity;
  cards.forEach((c) => {
    const r = c.getBoundingClientRect();
    const dd = Math.abs(r.left + r.width / 2 - mid);
    if (dd < d) { d = dd; best = c; }
  });
  setActive(best);
}

mm.add(DESKTOP, () => {
  const track = $(".services-track");
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(),
    ease: "none",
    onUpdate: pickCenter,
    scrollTrigger: {
      trigger: ".services-pin",
      start: "top top",
      end: () => "+=" + dist() * 1.4,
      pin: true,
      refreshPriority: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
});
mm.add(`${MOBILE}, (prefers-reduced-motion: reduce)`, () => {
  const row = $(".cards");
  const h = () => pickCenter();
  row.addEventListener("scroll", h, { passive: true });
  return () => row.removeEventListener("scroll", h);
});

/* ---------- Formación: cursor-following preview ---------- */
mm.add("(hover: hover) and (pointer: fine)", () => {
  const prev = $(".award-preview");
  const img = $("img", prev);
  const list = $(".awards-list");
  const dur = reduced ? 0 : 0.6;
  const xTo = gsap.quickTo(prev, "x", { duration: dur, ease: "power3" });
  const yTo = gsap.quickTo(prev, "y", { duration: dur, ease: "power3" });
  gsap.set(prev, { yPercent: -50, x: innerWidth / 2, y: innerHeight / 2 });

  const enter = (e) => {
    img.src = e.currentTarget.dataset.img;
    gsap.to(prev, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.5, ease: "expo.out" });
  };
  const leave = () => gsap.to(prev, { opacity: 0, scale: 0.7, duration: reduced ? 0 : 0.4 });
  const move = (e) => { xTo(e.clientX + 40); yTo(e.clientY - 20); };
  // si el usuario hace scroll sin mover el ratón, la vista previa no queda flotando
  const hideOnScroll = () => { if (!list.matches(":hover")) leave(); };

  $$("li", list).forEach((li) => li.addEventListener("mouseenter", enter));
  list.addEventListener("mouseleave", leave);
  window.addEventListener("mousemove", move);
  window.addEventListener("scroll", hideOnScroll, { passive: true });
  return () => {
    $$("li", list).forEach((li) => li.removeEventListener("mouseenter", enter));
    list.removeEventListener("mouseleave", leave);
    window.removeEventListener("mousemove", move);
    window.removeEventListener("scroll", hideOnScroll);
  };
});

/* ---------- Trusted: logos drifting around the headline ---------- */
// [x0, y0, x1, y1] en vw / vh relativos al centro, blur inicio/fin, escala inicio/fin
const LOGO_PATHS = [
  [-44, -6, -34, -22, 0, 6, 1, 0.8],  // servintegral
  [-28, 32, -6, 25, 6, 0, 0.8, 1.1],  // magna
  [8, -36, 22, -24, 4, 10, 0.9, 1.2], // cerescos
  [22, -30, 37, -8, 0, 3, 1, 1],      // grúas y equipos
  [-38, 28, -39, 8, 10, 2, 0.7, 1],   // unproject
  [40, 26, 18, 27, 8, 0, 0.8, 1.1],   // eneb
];
mm.add({ desktop: "(min-width: 861px)", motion: MOTION }, (ctx) => {
  const { desktop, motion } = ctx.conditions;
  // en móvil los logos se acercan al centro para no salirse de la pantalla
  const k = desktop ? 1 : 0.75;
  $$(".lg").forEach((el, i) => {
    const [x0, y0, x1, y1, b0, b1, s0, s1] = LOGO_PATHS[i];
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    if (!motion) {
      gsap.set(el, { x: (x1 * k * innerWidth) / 100, y: (y1 * innerHeight) / 100, opacity: 0.6 });
      return;
    }
    gsap.fromTo(el,
      { x: () => (x0 * k * innerWidth) / 100, y: () => (y0 * innerHeight) / 100, filter: `blur(${b0}px)`, scale: s0, opacity: 0.25 },
      {
        x: () => (x1 * k * innerWidth) / 100, y: () => (y1 * innerHeight) / 100, filter: `blur(${b1}px)`, scale: s1,
        keyframes: { opacity: [0.25, 1, 1, 0.2] },
        ease: "none",
        scrollTrigger: { trigger: ".trusted", start: "top bottom", end: "bottom top", scrub: 1, invalidateOnRefresh: true },
      });
  });
});

/* ---------- FAQ: animated accordion (one open at a time) ---------- */
const faqDur = (d) => (reduced ? 0 : d);
function closeFaq(d) {
  const body = $(".faq-a", d);
  gsap.to(body, {
    height: 0, duration: faqDur(0.45), ease: "power3.inOut",
    onComplete: () => { d.open = false; gsap.set(body, { clearProps: "height" }); ScrollTrigger.refresh(); },
  });
}
$$(".faq-item").forEach((d) => {
  const body = $(".faq-a", d);
  $("summary", d).addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) return closeFaq(d);
    $$(".faq-item[open]").forEach((o) => o !== d && closeFaq(o));
    d.open = true;
    gsap.fromTo(body, { height: 0 }, {
      height: "auto", duration: faqDur(0.55), ease: "power3.out",
      onComplete: () => { gsap.set(body, { clearProps: "height" }); ScrollTrigger.refresh(); },
    });
  });
});

addEventListener("load", () => ScrollTrigger.refresh());
