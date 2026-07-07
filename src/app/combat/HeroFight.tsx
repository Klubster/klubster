"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

const MONSTERS = [
  { src: "/combat/enemy-excel.png", name: "EXCEL" },
  { src: "/combat/enemy-cheque.png", name: "LE CHÈQUE" },
  { src: "/combat/enemy-certificat.png", name: "LE CERTIFICAT" },
  { src: "/combat/enemy-sms.png", name: "LE SMS" },
  { src: "/combat/boss-paperasse.png", name: "LA PAPERASSE" },
];

const HEROES = [
  { idle: "/combat/lea-idle.png", attack: "/combat/lea-attack.png" },
  { idle: "/combat/sam-idle.png", attack: "/combat/sam-attack.png" },
];

type Phase = "enter" | "hit" | "ko";

export default function HeroFight() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");
  const [combo, setCombo] = useState(1);
  const [reduce, setReduce] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) return;
    let cur = 0;
    const push = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
    const run = () => {
      setIdx(cur);
      setPhase("enter");
      push(() => setPhase("hit"), 950);
      push(() => { setPhase("ko"); setCombo((c) => (c % 99) + 1); }, 1250);
      push(() => { cur = (cur + 1) % MONSTERS.length; run(); }, 2050);
    };
    run();
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  }, []);

  const hero = HEROES[idx % HEROES.length];
  const m = MONSTERS[idx];
  const fighting = phase === "hit" || phase === "ko";
  const enemyHp = fighting ? 12 : 100;

  return (
    <div className="hf" aria-hidden="true">
      <style>{`
        .hf{max-width:1000px;margin:0 auto}
        .hf-hud{display:flex;align-items:center;gap:10px;font-family:'Press Start 2P';font-size:9px;color:var(--amb);margin-bottom:8px}
        .hf-hud .nm{min-width:44px}
        .hf-hud .nm.r{text-align:right}
        .hf-bar{flex:1;height:11px;border:2px solid #0c130f;background:#0c130f;box-shadow:0 0 0 1px #2a3a30;position:relative;overflow:hidden}
        .hf-bar>i{position:absolute;inset:0;background:linear-gradient(90deg,#ffd23f,#ff7a3f);transition:width .25s}
        .hf-bar.p1>i{width:100%;background:linear-gradient(90deg,#33c47d,#1f8f5a)}
        .hf-combo{font-family:'Press Start 2P';font-size:9px;color:var(--grn);white-space:nowrap}
        .hf-scene{--floor:15%;position:relative;height:clamp(210px,33vw,300px);overflow:hidden;border:3px solid #14231b;box-shadow:inset 0 0 0 2px #0c130f,0 0 0 1px #000;background:#0a0f0c}
        .hf-scene.shake{animation:hfshake .2s}
        @keyframes hfshake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,0)}}
        .hf-bg{position:absolute;inset:0;display:flex;width:200%;animation:hfscroll 34s linear infinite}
        .hf-bg.pause{animation-play-state:paused}
        .hf-bg.still{animation:none}
        .hf-bg img{width:50%;height:100%;object-fit:cover;object-position:center bottom;display:block}
        @keyframes hfscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .hf-hero{position:absolute;left:6%;bottom:var(--floor);height:clamp(120px,20vw,188px);z-index:3;transition:transform .12s ease}
        .hf-hero.lunge{transform:translateX(30px)}
        .hf-hero img{position:absolute;bottom:0;left:0;height:100%;width:auto;filter:drop-shadow(0 5px 4px rgba(0,0,0,.55));transition:opacity .08s}
        .hf-mon{position:absolute;right:6%;bottom:var(--floor);height:clamp(104px,17vw,168px);width:auto;z-index:2;transform:translateX(380px);filter:drop-shadow(0 5px 4px rgba(0,0,0,.55))}
        .hf-mon.enter{transform:translateX(0);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
        .hf-mon.hit{animation:hfhit .22s}
        @keyframes hfhit{0%{transform:translateX(0)}40%{transform:translateX(24px) rotate(6deg)}100%{transform:translateX(12px)}}
        .hf-mon.ko{transform:translateX(72px) translateY(30px) rotate(58deg);opacity:0;transition:all .6s ease-in}
        .hf-impact{position:absolute;right:26%;bottom:42%;font-family:'Press Start 2P';font-size:28px;color:#fff;opacity:0;z-index:4;text-shadow:0 0 10px rgba(255,204,51,.8)}
        .hf-impact.on{opacity:1;animation:hfpop .25s}
        .hf-ko{position:absolute;right:11%;bottom:56%;font-family:'Press Start 2P';font-size:26px;color:var(--red);text-shadow:2px 2px 0 #6b1e24;opacity:0;z-index:4}
        .hf-ko.on{opacity:1;animation:hfpop .25s}
        @keyframes hfpop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}
        .hf-cap{text-align:center;font-family:'Press Start 2P';font-size:8px;color:#5f7a6c;padding:9px 0 0}
        @media(max-width:640px){.hf-scene{--floor:14%}.hf-impact{font-size:20px}.hf-ko{font-size:18px}}
      `}</style>

      <div className="hf-hud">
        <span className="nm">1P</span>
        <div className="hf-bar p1"><i /></div>
        <span className="hf-combo">COMBO ×{combo}</span>
        <div className="hf-bar"><i style={{ width: reduce ? "100%" : enemyHp + "%" }} /></div>
        <span className="nm r">{m.name}</span>
      </div>

      <div className={"hf-scene" + (phase === "hit" ? " shake" : "")}>
        <div className={"hf-bg" + (reduce ? " still" : fighting ? " pause" : "")}>
          <img src="/combat/street.jpg" alt="" />
          <img src="/combat/street.jpg" alt="" />
        </div>

        <div className={"hf-hero" + (phase === "hit" ? " lunge" : "")}>
          <img src={hero.idle} alt="" style={{ opacity: phase === "hit" ? 0 : 1 }} />
          <img src={hero.attack} alt="" style={{ opacity: phase === "hit" ? 1 : 0 }} />
        </div>

        <div className={"hf-impact" + (phase === "hit" ? " on" : "")}>✸</div>
        <div className={"hf-ko" + (phase === "ko" ? " on" : "")}>K.O.</div>

        <img className={"hf-mon " + phase} key={idx} src={m.src} alt="" />
      </div>

      <p className="hf-cap">TON CLUB CONTRE LA PAPERASSE — DÉMO</p>
    </div>
  );
}
