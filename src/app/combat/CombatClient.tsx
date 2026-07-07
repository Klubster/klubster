"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LEVELS: [string, string, string][] = [
  ["LEVEL 1", "Crée ton club.", "Un nom, tes couleurs, ton identité."],
  ["LEVEL 2", "Publie tes cours.", "Chaque adhérent choisit les siens."],
  ["LEVEL 3", "Montre ton club.", "Pas une page vide : photos, palmarès, coachs, FAQ."],
  ["LEVEL 4", "Ouvre les inscriptions.", "Tu n’as plus rien à envoyer — les dossiers arrivent seuls."],
];

const DISCIPLINES = [
  "Boxe anglaise", "Boxe française · Savate", "Kickboxing", "Full contact",
  "Muay thaï", "MMA", "Karaté", "Jiu-jitsu brésilien", "Judo", "Krav maga",
];

// HUD stats — libellé court + bénéfice réel
const STATS: [string, string][] = [
  ["SITE", "ton site en ligne le soir même"],
  ["INSCRIPTIONS", "elles se remplissent toutes seules"],
  ["PAIEMENTS", "les cotisations arrivent — 0 % de commission"],
  ["LICENCES", "plus jamais de licence oubliée"],
  ["PRÉSENCES", "l’appel prend trois secondes"],
  ["COMMUNICATION", "tout le club prévenu en deux clics"],
];

const TIERS: [string, string, string][] = [
  ["LIGHTWEIGHT", "Jusqu’à 300 adhérents", "9 €"],
  ["MIDDLEWEIGHT", "301 à 500 adhérents", "19 €"],
  ["HEAVYWEIGHT", "Plus de 500 adhérents", "29 €"],
];

type Intro = null | "ready" | "fight" | "done";

export default function CombatClient() {
  const [intro, setIntro] = useState<Intro>(null);
  const [soundOn, setSoundOn] = useState(false);
  const acRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("cmb_intro_seen") === "1"; } catch { seen = false; }
    if (reduce || seen) { setIntro("done"); return; }
    try { sessionStorage.setItem("cmb_intro_seen", "1"); } catch { /* noop */ }
    setIntro("ready");
    const t1 = window.setTimeout(() => setIntro("fight"), 1100);
    const t2 = window.setTimeout(() => setIntro("done"), 2600);
    const skip = () => { setIntro("done"); };
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    return () => {
      window.clearTimeout(t1); window.clearTimeout(t2);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
    };
  }, []);

  function getAC(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!acRef.current) {
      const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext ?? W.webkitAudioContext;
      if (!AC) return null;
      acRef.current = new AC();
    }
    return acRef.current;
  }

  function beep(freq: number, dur = 0.06, type: OscillatorType = "square") {
    const c = getAC();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch { /* audio indisponible */ }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      const c = getAC();
      if (c && c.state === "suspended") { c.resume().catch(() => {}); }
      beep(880, 0.08); beep(1180, 0.09, "square");
    }
  }

  function hover() { if (soundOn) beep(520, 0.04); }

  function select() {
    if (soundOn) { beep(660, 0.07); beep(990, 0.11); }
    const el = document.getElementById("stats");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="cmb">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600&family=Press+Start+2P&display=swap');
        .cmb{--grn:#33c47d;--grnd:#279B65;--amb:#ffcc33;--red:#ff4d5e;--bg:#080c0a;--ink:#e9f2ec;
          font-family:'Chakra Petch',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;
          position:relative;overflow-x:hidden;font-size:18px;line-height:1.45}
        .cmb::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;
          background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
        .cmb a{color:inherit;text-decoration:none}
        .cmb .px{font-family:'Press Start 2P';line-height:1.5}
        .cmb-shell{max-width:1000px;margin:0 auto;padding:0 20px}
        /* intro */
        .cmb-intro{position:fixed;inset:0;z-index:100;background:#050706;display:flex;align-items:center;justify-content:center;cursor:pointer;text-align:center}
        .cmb-intro.f{animation:cmbwhite .4s ease}
        @keyframes cmbwhite{0%{background:#f6fff9}30%{background:#050706}100%{background:#050706}}
        .cmb-intro .r{font-family:'Press Start 2P';font-size:15px;color:var(--amb);letter-spacing:4px}
        .cmb-intro .s{font-family:'Press Start 2P';font-size:46px;color:var(--red);margin-top:20px;text-shadow:4px 4px 0 #6b1e24;animation:cmbpop .25s ease}
        @keyframes cmbpop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
        .cmb-intro .h{font-size:15px;color:#6f857a;margin-top:30px}
        /* HUD nav */
        .cmb-hud{position:sticky;top:0;z-index:40;display:flex;justify-content:space-between;align-items:center;
          background:#0a0f0c;border-bottom:2px solid #16261d;padding:12px 20px}
        .cmb-hud .l{font-family:'Press Start 2P';font-size:11px;color:var(--grn)}
        .cmb-hud .l b{color:var(--amb)}
        .cmb-hud .cta{font-family:'Press Start 2P';font-size:9px;color:#081109;background:var(--grn);padding:9px 12px;box-shadow:3px 3px 0 var(--grnd)}
        .cmb-back{font-size:18px;color:#6f8c7d}
        .cmb-snd{font-family:'Press Start 2P';font-size:9px;color:#6f8c7d;background:none;border:2px solid #16261d;padding:7px 9px;cursor:pointer}
        .cmb-snd.on{color:var(--grn);border-color:var(--grnd)}
        .cmb-sec{border-top:2px solid #101a15;padding:52px 0}
        .cmb-kick{font-family:'Press Start 2P';font-size:10px;color:var(--grn);letter-spacing:2px}
        .cmb-h2{font-family:'Press Start 2P';font-size:19px;color:#fff;line-height:1.5;margin:16px 0 0;text-shadow:3px 3px 0 var(--grnd)}
        .cmb-lead{max-width:640px;margin-top:16px;font-size:18px;line-height:1.5;color:#d3e4da;font-weight:500}
        .cmb-blink{animation:cmbbl 1.1s steps(2) infinite}@keyframes cmbbl{50%{opacity:.4}}
        .cmb-cur{color:var(--grn);animation:cmbbl 1s steps(2) infinite}
        .cmb-hero{text-align:center;padding:44px 0 8px;background:radial-gradient(120% 80% at 50% 0%,#0d1712 0%,#080c0a 70%)}
        .cmb-round{font-family:'Press Start 2P';font-size:11px;color:var(--red);letter-spacing:2px;text-shadow:0 0 8px rgba(255,77,94,.5)}
        .cmb-round b{color:var(--amb)}
        .cmb-title{font-family:'Press Start 2P';font-size:clamp(18px,4.6vw,30px);line-height:1.55;margin:18px 0 0;color:#fff;text-shadow:3px 3px 0 var(--grnd),6px 6px 0 rgba(0,0,0,.6)}
        .cmb-title span{color:var(--grn)}
        .cmb-hsub{font-size:19px;color:#dcebe3;font-weight:500;max-width:600px;margin:18px auto 0}
        .cmb-cta{display:inline-block;font-family:'Press Start 2P';font-size:12px;color:#081109;background:var(--grn);padding:16px 20px;box-shadow:5px 5px 0 var(--grnd)}
        .cmb-proof{margin-top:18px;font-size:16px;color:#9fb8ab}
        .cmb-proof b{color:var(--grn)}
        .cmb-sel{font-family:'Press Start 2P';font-size:10px;color:var(--grn);letter-spacing:2px;margin:30px 0 14px}
        .cmb-vs{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap}
        .cmb-fighter{font-family:inherit;text-align:left;background:#0b1410;border:2px solid #1c3327;width:288px;
          overflow:hidden;box-shadow:5px 5px 0 rgba(0,0,0,.5);cursor:pointer;padding:0;color:inherit;
          transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
        .cmb-fighter:hover,.cmb-fighter:focus-visible{transform:translateY(-6px);border-color:var(--grn);box-shadow:0 0 0 2px var(--grnd),7px 9px 0 rgba(0,0,0,.55);outline:none}
        .cmb-imgwrap{overflow:hidden}
        .cmb-fighter img{display:block;width:100%;height:auto;transition:transform .3s ease}
        .cmb-fighter:hover img,.cmb-fighter:focus-visible img{transform:scale(1.05)}
        .cmb-meta{padding:12px 14px 14px}
        .cmb-name{font-family:'Press Start 2P';font-size:12px;color:#fff}
        .cmb-name small{color:var(--amb);font-size:8px}
        .cmb-hp{height:10px;margin-top:10px;border:2px solid #16261d;background:#0c130f;position:relative;overflow:hidden}
        .cmb-hp>i{position:absolute;inset:0;width:0;background:repeating-linear-gradient(90deg,var(--grnd) 0 7px,var(--grn) 7px 14px);transition:width .5s cubic-bezier(.2,.8,.2,1)}
        .cmb-fighter:hover .cmb-hp>i,.cmb-fighter:focus-visible .cmb-hp>i{width:100%}
        .cmb-pick{font-family:'Press Start 2P';font-size:8px;color:#5f7a6c;margin-top:12px;letter-spacing:1px}
        .cmb-fighter:hover .cmb-pick,.cmb-fighter:focus-visible .cmb-pick{color:var(--amb)}
        .cmb-vsbadge{font-family:'Press Start 2P';font-size:28px;color:var(--amb);text-shadow:2px 2px 0 #7a5a00}
        .cmb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:28px}
        .cmb-card{background:#0b1410;border:2px solid #16261d;padding:18px}
        .cmb-card .lv{font-family:'Press Start 2P';font-size:9px;color:var(--amb)}
        .cmb-card h3{font-size:26px;color:#fff;margin:12px 0 6px}
        .cmb-card p{font-size:19px;color:#a9c6b6}
        .cmb-ko{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:26px;border:2px solid #16261d}
        .cmb-ko>div{padding:26px}
        .cmb-ko .a{background:#0b1410;border-right:2px solid #16261d}
        .cmb-ko .a li{font-size:20px;color:#8fae9e;list-style:none}
        .cmb-ko .b{background:#0d1a13;text-align:center}
        .cmb-ko .b .kox{font-family:'Press Start 2P';font-size:26px;color:var(--red);text-shadow:2px 2px 0 #6b1e24}
        .cmb-ko .b .n{font-size:44px;color:#fff;margin-top:8px}
        /* HUD stats */
        .cmb-hp2{display:grid;grid-template-columns:170px 1fr;gap:12px 16px;align-items:center;margin-top:26px;max-width:720px}
        .cmb-hp2 .lab{font-family:'Press Start 2P';font-size:9px;color:#fff}
        .cmb-hp2 .row{display:flex;align-items:center;gap:12px}
        .cmb-hp2 .bar{flex:0 0 120px;height:12px;border:2px solid #16261d;background:#0c130f;position:relative;overflow:hidden}
        .cmb-hp2 .bar>i{position:absolute;inset:0;background:repeating-linear-gradient(90deg,var(--grnd) 0 7px,var(--grn) 7px 14px)}
        .cmb-hp2 .ben{font-size:19px;color:#a9c6b6}
        .cmb-timer{font-family:'Press Start 2P';font-size:clamp(30px,9vw,52px);color:var(--grn);text-shadow:4px 4px 0 var(--grnd),8px 8px 0 rgba(0,0,0,.5);margin:26px 0 6px;letter-spacing:2px}
        .cmb-badges{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}
        .cmb-badges span{font-family:'Press Start 2P';font-size:9px;color:var(--grn);border:2px solid #1c3327;background:#0b1410;padding:10px 12px}
        .cmb-disc{margin-top:20px;font-size:18px;line-height:2;color:#d3e4da;font-weight:500}
        .cmb-disc b{color:var(--grn)}
        .cmb-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}
        .cmb-tier{background:#0b1410;border:2px solid #16261d;padding:22px 16px;text-align:center}
        .cmb-tier .pl{font-family:'Press Start 2P';font-size:10px;color:var(--amb)}
        .cmb-tier .sz{font-size:19px;color:#8fae9e;margin-top:12px}
        .cmb-tier .pr{font-family:'Press Start 2P';font-size:20px;color:var(--grn);margin:12px 0 4px}
        .cmb-tier .mo{font-size:18px;color:#6f8c7d}
        .cmb-inc{margin-top:24px;max-width:640px}
        .cmb-quote{max-width:640px}
        .cmb-sign{font-family:'Press Start 2P';font-size:9px;color:var(--grn);margin-top:18px}
        .cmb-foot{border-top:2px solid #101a15;padding:30px 0;font-size:17px;color:#6f8c7d}
        .cmb-foot a{color:#9fb8ab;margin-right:16px}
        .cmb-badge{font-size:18px;color:#8fae9e;margin-top:22px}
        .cmb-badge b{color:var(--grn)}
        @media(max-width:640px){
          .cmb{font-size:17px}
          .cmb-shell{padding:0 16px}
          .cmb-sec{padding:38px 0}
          .cmb-hud{padding:10px 13px}
          .cmb-hud .l{font-size:9px}
          .cmb-hud .cta{font-size:8px;padding:8px 10px;box-shadow:2px 2px 0 var(--grnd)}
          .cmb-snd{font-size:8px;padding:6px 8px}
          .cmb-back{display:none}
          .cmb-hero{padding:28px 0 6px}
          .cmb-title{font-size:14px;line-height:1.55}
          .cmb-hsub{font-size:17px}
          .cmb-h2{font-size:14px;line-height:1.5}
          .cmb-lead{font-size:17px}
          .cmb-proof{font-size:14px}
          .cmb-sel{margin:24px 0 12px}
          .cmb-vs{gap:12px}
          .cmb-fighter{width:78vw;max-width:280px}
          .cmb-vsbadge{font-size:20px}
          .cmb-grid,.cmb-tiers{grid-template-columns:1fr}
          .cmb-card h3{font-size:22px}
          .cmb-hp2{grid-template-columns:1fr;gap:5px 12px;margin-top:20px}
          .cmb-hp2 .lab{font-size:8px}
          .cmb-hp2 .ben{font-size:15px}
          .cmb-hp2 .bar{flex:0 0 84px}
          .cmb-disc{font-size:16px;line-height:1.9}
          .cmb-badges span{font-size:8px;padding:9px 10px}
          .cmb-tier .pl{font-size:9px}
          .cmb-sign{font-size:8px;line-height:1.6}
          .cmb-foot a{display:inline-block;margin:0 14px 8px 0}
          .cmb-intro .r{font-size:12px}
          .cmb-intro .s{font-size:28px}
        }
      `}</style>

      {intro && intro !== "done" ? (
        <div className={intro === "fight" ? "cmb-intro f" : "cmb-intro"} onClick={() => setIntro("done")}>
          <div>
            <div className="r">ROUND 1</div>
            <div className="s">{intro === "ready" ? "READY" : "FIGHT!"}</div>
            <div className="h">clique ou scrolle pour passer</div>
          </div>
        </div>
      ) : null}

      <div className="cmb-hud">
        <span className="l">KLUBSTER <b>⚔</b> COMBAT</span>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button type="button" onClick={toggleSound} className={soundOn ? "cmb-snd on" : "cmb-snd"} aria-pressed={soundOn}>
            {soundOn ? "SON ►" : "SON ◼"}
          </button>
          <Link href="/" className="cmb-back">← mode normal</Link>
          <Link href="/creer" className="cta">CRÉER MON CLUB</Link>
        </span>
      </div>

      <section className="cmb-hero">
        <div className="cmb-shell">
          <div className="cmb-round">◄ ROUND 1 — <b>FIGHT!</b> ►</div>
          <h1 className="cmb-title">Tu entraînes.<br /><span>Klubster administre.</span></h1>
          <p className="cmb-hsub">Le logiciel pensé pour les clubs de combat. Inscriptions, licences, certificats, paiements et communication.</p>

          <div className="cmb-sel">— PLAYER SELECT —</div>
          <div className="cmb-vs">
            <button type="button" className="cmb-fighter" onMouseEnter={hover} onClick={select}>
              <div className="cmb-imgwrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/combat/karateka.jpg" alt="Karatéka en garde, style arcade rétro" />
              </div>
              <div className="cmb-meta">
                <div className="cmb-name">LÉA <small>KARATÉ</small></div>
                <div className="cmb-hp"><i /></div>
                <div className="cmb-pick">▶ FONCTIONNALITÉS KARATÉ</div>
              </div>
            </button>
            <div className="cmb-vsbadge cmb-blink">VS</div>
            <button type="button" className="cmb-fighter" onMouseEnter={hover} onClick={select}>
              <div className="cmb-imgwrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/combat/boxeur.jpg" alt="Boxeur en garde, style arcade rétro" />
              </div>
              <div className="cmb-meta">
                <div className="cmb-name">SAM <small>BOXE</small></div>
                <div className="cmb-hp"><i /></div>
                <div className="cmb-pick">▶ FONCTIONNALITÉS BOXE</div>
              </div>
            </button>
          </div>

          <div style={{ marginTop: 30, paddingBottom: 8 }}>
            <Link href="/creer" className="cmb-cta cmb-blink">▶ INSÉRER UNE PIÈCE — CRÉER MON CLUB</Link>
            <p className="cmb-proof"><b>●</b> Pas une démo — utilisé chaque semaine, sur une saison complète, à l’USM Boxe Anglaise.</p>
          </div>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">SELECT · 4 NIVEAUX_</p>
          <h2 className="cmb-h2">Ton club est prêt avant le prochain entraînement.</h2>
          <div className="cmb-grid">
            {LEVELS.map(([lv, t, d]) => (
              <div className="cmb-card" key={lv}>
                <div className="lv">{lv}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cmb-sec" id="stats">
        <div className="cmb-shell">
          <p className="cmb-kick">ATTRIBUTS · TOUT INCLUS_</p>
          <h2 className="cmb-h2">Rien à débloquer. Tout est déjà au max.</h2>
          <div className="cmb-hp2">
            {STATS.map(([lab, ben]) => (
              <div className="row" key={lab} style={{ display: "contents" }}>
                <div className="lab">{lab}</div>
                <div className="row">
                  <div className="bar"><i /></div>
                  <div className="ben">{ben}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">TIME ATTACK · 30:00_</p>
          <h2 className="cmb-h2">Ton club configuré en moins de 30 minutes.</h2>
          <p className="cmb-lead">Tu n’as rien à apprendre. Tu remplis ton club comme tu remplirais un formulaire. Trente minutes plus tard, ton site est ouvert.</p>
          <div className="cmb-timer">30:00</div>
          <div className="cmb-badges">
            <span>✓ SANS CODE</span>
            <span>✓ SANS FORMATION</span>
            <span>✓ SANS COMPÉTENCE TECHNIQUE</span>
          </div>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">FIGHTERS_</p>
          <h2 className="cmb-h2">Toutes les disciplines de combat. Un seul outil.</h2>
          <p className="cmb-disc">
            {DISCIPLINES.map((d, i) => (
              <span key={d}>{d}{i < DISCIPLINES.length - 1 ? <b> · </b> : null}</span>
            ))}
          </p>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell cmb-quote">
          <p className="cmb-kick">QUI FAIT KLUBSTER_</p>
          <h2 className="cmb-h2">J’en avais besoin.</h2>
          <p className="cmb-lead">
            Pendant quinze ans, j’ai fait vivre des associations. Neuf ans au bureau d’un club de boxe, puis fondateur et président de l’USM Boxe Anglaise depuis quatre ans. Des licences à saisir, des certificats à relancer, des chèques à encaisser un mercredi soir après l’entraînement.
          </p>
          <p className="cmb-lead">Klubster, c’est l’outil que j’aurais voulu avoir. Je l’ai construit depuis mon club — pour le mien d’abord, puis pour tous les autres.</p>
          <p className="cmb-sign">MATHIEU BOURDIEU — PRÉSIDENT-FONDATEUR, USM BOXE ANGLAISE<span className="cmb-cur">_</span></p>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">CONTINUE?_</p>
          <h2 className="cmb-h2">Un seul Klubster. Le tarif grandit avec ton club.</h2>
          <div className="cmb-tiers">
            {TIERS.map(([pl, sz, pr]) => (
              <div className="cmb-tier" key={pl}>
                <div className="pl">{pl}</div>
                <div className="sz">{sz}</div>
                <div className="pr">{pr}</div>
                <div className="mo">/ mois</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 22, fontSize: 18, color: "#6f8c7d" }}>
            Les paiements arrivent directement sur ton compte Stripe. Klubster ne prélève aucune commission. Sans engagement.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link href="/creer" className="cmb-cta cmb-blink">▶ INSERT COIN — CRÉER MON CLUB</Link>
          </div>
        </div>
      </section>

      <footer className="cmb-foot">
        <div className="cmb-shell">
          <div>
            <Link href="/creer">Créer mon club</Link>
            <Link href="/connexion">Espace président</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgv">CGV</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </div>
          <p className="cmb-badge"><b>●</b> Développé à Montauban. Testé au ring, chaque semaine, à l’USM Boxe.</p>
          <p style={{ marginTop: 14, fontSize: 15, color: "#4f645a" }}>© 2026 KLUBSTER</p>
        </div>
      </footer>
    </div>
  );
}
