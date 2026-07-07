"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";

const HEROES = [
  { name: "LÉA", walk: ["/combat/lea-walk2.png"], attack: "/combat/lea-attack.png" },
  { name: "SAM", walk: ["/combat/sam-walk1.png", "/combat/sam-walk2.png"], attack: "/combat/sam-attack.png" },
];

const MONSTERS = [
  { src: "/combat/enemy-excel.png", name: "EXCEL", scale: 1 },
  { src: "/combat/enemy-cheque.png", name: "LE CHÈQUE", scale: 0.92 },
  { src: "/combat/enemy-certificat.png", name: "LE CERTIFICAT", scale: 1 },
  { src: "/combat/enemy-sms.png", name: "LE SMS", scale: 1 },
  { src: "/combat/boss-paperasse.png", name: "LA PAPERASSE", scale: 1.32 },
];

type Phase = "walk" | "hit" | "ko";

export default function HeroFight() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("walk");
  const [entered, setEntered] = useState(false);
  const [wf, setWf] = useState(0);
  const [combo, setCombo] = useState(1);
  const [reduce, setReduce] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) { setEntered(true); return; }
    let cur = 0;
    const push = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const run = () => {
      setIdx(cur); setPhase("walk"); setEntered(false);
      push(() => setEntered(true), 40);
      push(() => setPhase("hit"), 1150);
      push(() => { setPhase("ko"); setCombo((c) => (c % 99) + 1); }, 1450);
      push(() => { cur = (cur + 1) % MONSTERS.length; run(); }, 2250);
    };
    run();
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  }, []);

  useEffect(() => {
    if (reduce || phase !== "walk") return;
    const id = window.setInterval(() => setWf((f) => f ^ 1), 200);
    return () => window.clearInterval(id);
  }, [phase, idx, reduce]);

  const hero = HEROES[idx % HEROES.length];
  const m = MONSTERS[idx];
  const fighting = phase === "hit" || phase === "ko";
  const heroSrc = fighting ? hero.attack : hero.walk[wf % hero.walk.length];

  let mt = "translateX(380px)", mo = 1, dur = "0.6s";
  if (phase === "walk") { mt = entered ? "translateX(0)" : "translateX(380px)"; dur = "0.6s"; }
  else if (phase === "hit") { mt = "translateX(16px) rotate(6deg)"; dur = "0.18s"; }
  else if (phase === "ko") { mt = "translateX(74px) translateY(34px) rotate(58deg)"; mo = 0; dur = "0.6s"; }

  return (
    <div className="hf" aria-hidden="true">
      <style>{`
        .hf{max-width:1000px;margin:0 auto}
        .hf-hud{display:flex;align-items:center;gap:10px;font-family:'Press Start 2P';font-size:9px;color:var(--amb);margin-bottom:8px}
        .hf-hud .nm{min-width:44px}.hf-hud .nm.r{text-align:right}
        .hf-bar{flex:1;height:11px;border:2px solid #0c130f;background:#0c130f;box-shadow:0 0 0 1px #2a3a30;position:relative;overflow:hidden}
        .hf-bar>i{position:absolute;inset:0;background:linear-gradient(90deg,#ffd23f,#ff7a3f);transition:width .25s}
        .hf-bar.p1>i{width:100%;background:linear-gradient(90deg,#33c47d,#1f8f5a)}
        .hf-combo{font-family:'Press Start 2P';font-size:9px;color:var(--grn);white-space:nowrap}
        .hf-scene{--floor:16%;position:relative;height:clamp(230px,34vw,320px);overflow:hidden;border:3px solid #14231b;box-shadow:inset 0 0 0 2px #0c130f,0 0 0 1px #000;background:#0a0f0c}
        .hf-scene.shake{animation:hfshake .2s}
        @keyframes hfshake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,0)}}
        .hf-bg{position:absolute;inset:0;display:flex;width:200%;animation:hfscroll 32s linear infinite}
        .hf-bg.pause{animation-play-state:paused}.hf-bg.still{animation:none}
        .hf-bg img{width:50%;height:100%;object-fit:cover;object-position:center bottom;display:block}
        @keyframes hfscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .hf-hero{position:absolute;left:7%;bottom:var(--floor);height:clamp(160px,25vw,246px);z-index:3;transition:transform .12s ease}
        .hf-hero img{display:block;height:100%;width:auto;filter:drop-shadow(0 5px 5px rgba(0,0,0,.6))}
        .hf-hero.walking{animation:hfbob .4s ease-in-out infinite}
        @keyframes hfbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .hf-hero.lunge{transform:translateX(34px)}
        .hf-mon{position:absolute;right:8%;bottom:var(--floor);height:calc(clamp(140px,21vw,210px) * var(--sc,1));width:auto;z-index:2;
          filter:drop-shadow(0 5px 5px rgba(0,0,0,.6));transition-property:transform,opacity;transition-timing-function:cubic-bezier(.2,.8,.2,1)}
        .hf-impact{position:absolute;right:30%;bottom:46%;font-family:'Press Start 2P';font-size:30px;color:#fff;opacity:0;z-index:4;text-shadow:0 0 12px rgba(255,204,51,.9)}
        .hf-impact.on{opacity:1;animation:hfpop .25s}
        .hf-ko{position:absolute;right:13%;bottom:60%;font-family:'Press Start 2P';font-size:28px;color:var(--red);text-shadow:2px 2px 0 #6b1e24;opacity:0;z-index:4}
        .hf-ko.on{opacity:1;animation:hfpop .25s}
        @keyframes hfpop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}
        .hf-cap{text-align:center;font-family:'Press Start 2P';font-size:8px;color:#5f7a6c;padding:9px 0 0}
        @media(max-width:640px){.hf-scene{--floor:15%}.hf-impact{font-size:20px}.hf-ko{font-size:18px}}
      `}</style>

      <div className="hf-hud">
        <span className="nm">1P</span>
        <div className="hf-bar p1"><i /></div>
        <span className="hf-combo">COMBO ×{combo}</span>
        <div className="hf-bar"><i style={{ width: reduce ? "100%" : (fighting ? "10%" : "100%") }} /></div>
        <span className="nm r">{m.name}</span>
      </div>

      <div className={"hf-scene" + (phase === "hit" ? " shake" : "")}>
        <div className={"hf-bg" + (reduce ? " still" : fighting ? " pause" : "")}>
          <img src="/combat/street.jpg" alt="" />
          <img src="/combat/street.jpg" alt="" />
        </div>

        <div className={"hf-hero" + (phase === "hit" ? " lunge" : (!reduce && phase === "walk" ? " walking" : ""))}>
          <img src={heroSrc} alt="" />
        </div>

        <div className={"hf-impact" + (phase === "hit" ? " on" : "")}>✸</div>
        <div className={"hf-ko" + (phase === "ko" ? " on" : "")}>K.O.</div>

        <img className="hf-mon" src={m.src} alt=""
          style={{ transform: reduce ? "translateX(0)" : mt, opacity: mo, transitionDuration: dur, ["--sc" as string]: String(m.scale) } as unknown as CSSProperties} />
      </div>

      <p className="hf-cap">TON CLUB CONTRE LA PAPERASSE — DÉMO</p>
    </div>
  );
}
