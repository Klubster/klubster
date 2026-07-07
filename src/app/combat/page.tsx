import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Klubster Combat — Ton club de combat, au même endroit",
  description:
    "Inscriptions, licences, paiements, communication, site web — Klubster, version ring. Pensé pour les clubs de boxe, kickboxing, full contact, MMA, karaté. Créé par un président de club.",
};

const LEVELS: [string, string, string][] = [
  ["LEVEL 1", "Crée ton club.", "Un nom, un design, tes couleurs."],
  ["LEVEL 2", "Ajoute tes cours.", "Créneaux et tarifs, en quelques lignes."],
  ["LEVEL 3", "Règle ta page.", "Photos, palmarès, FAQ — prêts à l’emploi."],
  ["LEVEL 4", "Ouvre les inscriptions.", "Ton site est en ligne. Les dossiers arrivent seuls."],
];

const DISCIPLINES = [
  "Boxe anglaise", "Boxe française · Savate", "Kickboxing", "Full contact",
  "Muay thaï", "MMA", "Karaté", "Jiu-jitsu brésilien", "Judo", "Krav maga",
];

const TIERS: [string, string][] = [
  ["Jusqu’à 300 adhérents", "9 €"],
  ["301 à 500 adhérents", "19 €"],
  ["Plus de 500 adhérents", "29 €"],
];

const INCLUS = [
  "Le site de ton club, en ligne dès le premier soir",
  "Les inscriptions se remplissent seules — mineurs, cours, pièces",
  "Les cotisations arrivent direct sur le compte du club — 0 % de commission",
  "Le paiement en 1 ou 3 fois, au choix",
  "Les certificats et licences au bon endroit, sans les courir après",
  "Préviens tout le club en deux coups",
  "L’appel en scannant la carte d’adhérent",
];

export default function CombatPage() {
  return (
    <div className="cmb">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
        .cmb{--grn:#33c47d;--grnd:#279B65;--amb:#ffcc33;--red:#ff4d5e;--bg:#080c0a;--ink:#e9f2ec;
          font-family:'VT323',monospace;background:var(--bg);color:var(--ink);min-height:100vh;
          position:relative;overflow-x:hidden;font-size:20px;line-height:1.15}
        .cmb::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;
          background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
        .cmb a{color:inherit;text-decoration:none}
        .cmb .px{font-family:'Press Start 2P';line-height:1.5}
        .cmb-shell{max-width:1000px;margin:0 auto;padding:0 20px}
        .cmb-hud{position:sticky;top:0;z-index:40;display:flex;justify-content:space-between;align-items:center;
          background:#0a0f0c;border-bottom:2px solid #16261d;padding:12px 20px}
        .cmb-hud .l{font-family:'Press Start 2P';font-size:11px;color:var(--grn)}
        .cmb-hud .l b{color:var(--amb)}
        .cmb-hud .cta{font-family:'Press Start 2P';font-size:9px;color:#081109;background:var(--grn);padding:9px 12px;box-shadow:3px 3px 0 var(--grnd)}
        .cmb-back{font-size:18px;color:#6f8c7d}
        .cmb-sec{border-top:2px solid #101a15;padding:52px 0}
        .cmb-kick{font-family:'Press Start 2P';font-size:10px;color:var(--grn);letter-spacing:2px}
        .cmb-h2{font-family:'Press Start 2P';font-size:19px;color:#fff;line-height:1.5;margin:16px 0 0;text-shadow:3px 3px 0 var(--grnd)}
        .cmb-lead{max-width:640px;margin-top:16px;font-size:22px;color:#bcd3c6}
        .cmb-blink{animation:cmbbl 1.1s steps(2) infinite}@keyframes cmbbl{50%{opacity:.4}}
        .cmb-cur{color:var(--grn);animation:cmbbl 1s steps(2) infinite}
        .cmb-hero{text-align:center;padding:44px 0 8px;background:radial-gradient(120% 80% at 50% 0%,#0d1712 0%,#080c0a 70%)}
        .cmb-round{font-family:'Press Start 2P';font-size:11px;color:var(--red);letter-spacing:2px;text-shadow:0 0 8px rgba(255,77,94,.5)}
        .cmb-round b{color:var(--amb)}
        .cmb-title{font-family:'Press Start 2P';font-size:30px;line-height:1.5;margin:18px 0 0;color:#fff;text-shadow:3px 3px 0 var(--grnd),6px 6px 0 rgba(0,0,0,.6)}
        .cmb-title span{color:var(--grn)}
        .cmb-hsub{font-size:23px;color:#bcd3c6;max-width:560px;margin:16px auto 0}
        .cmb-cta{display:inline-block;font-family:'Press Start 2P';font-size:12px;color:#081109;background:var(--grn);padding:16px 20px;box-shadow:5px 5px 0 var(--grnd)}
        .cmb-sel{font-family:'Press Start 2P';font-size:10px;color:var(--grn);letter-spacing:2px;margin:30px 0 14px}
        .cmb-vs{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
        .cmb-fighter{background:#0b1410;border:2px solid #1c3327;width:250px;overflow:hidden;box-shadow:5px 5px 0 rgba(0,0,0,.5)}
        .cmb-fighter img{display:block;width:100%;height:auto}
        .cmb-meta{padding:12px 14px 14px;text-align:left}
        .cmb-name{font-family:'Press Start 2P';font-size:12px;color:#fff}
        .cmb-name small{color:var(--amb);font-size:8px}
        .cmb-hp{height:9px;margin-top:10px;border:2px solid #16261d;background:#0c130f;position:relative;overflow:hidden}
        .cmb-hp>i{position:absolute;inset:0;background:var(--grn)}
        .cmb-fstat{font-size:18px;color:#a9c6b6;margin-top:8px}
        .cmb-vsbadge{font-family:'Press Start 2P';font-size:26px;color:var(--amb);text-shadow:2px 2px 0 #7a5a00}
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
        .cmb-disc{margin-top:20px;font-size:22px;line-height:2;color:#bcd3c6}
        .cmb-disc b{color:var(--grn)}
        .cmb-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}
        .cmb-tier{background:#0b1410;border:2px solid #16261d;padding:22px 16px;text-align:center}
        .cmb-tier .sz{font-size:19px;color:#8fae9e}
        .cmb-tier .pr{font-family:'Press Start 2P';font-size:20px;color:var(--grn);margin:14px 0 4px}
        .cmb-tier .mo{font-size:18px;color:#6f8c7d}
        .cmb-inc{margin-top:24px;max-width:640px}
        .cmb-inc li{list-style:none;font-size:20px;color:#bcd3c6;padding:5px 0}
        .cmb-inc li b{color:var(--grn)}
        .cmb-quote{max-width:640px}
        .cmb-sign{font-family:'Press Start 2P';font-size:9px;color:var(--grn);margin-top:18px}
        .cmb-foot{border-top:2px solid #101a15;padding:30px 0;font-size:17px;color:#6f8c7d}
        .cmb-foot a{color:#9fb8ab;margin-right:16px}
        .cmb-badge{font-size:18px;color:#8fae9e;margin-top:22px}
        .cmb-badge b{color:var(--grn)}
        @media(max-width:640px){.cmb-title{font-size:20px}.cmb-h2{font-size:15px}.cmb-grid,.cmb-ko,.cmb-tiers{grid-template-columns:1fr}.cmb-ko .a{border-right:0;border-bottom:2px solid #16261d}.cmb-fighter{width:44vw}}
      `}</style>

      <div className="cmb-hud">
        <span className="l">KLUBSTER <b>⚔</b> COMBAT</span>
        <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" className="cmb-back">← mode normal</Link>
          <Link href="/creer" className="cta">CRÉER MON CLUB</Link>
        </span>
      </div>

      <section className="cmb-hero">
        <div className="cmb-shell">
          <div className="cmb-round">◄ ROUND 1 — <b>FIGHT!</b> ►</div>
          <h1 className="cmb-title">TON CLUB.<br />AU MÊME <span>ENDROIT.</span></h1>
          <p className="cmb-hsub">Inscriptions, licences, paiements, coms — Klubster, version ring. Même outil, prêt en 30 min.</p>

          <div className="cmb-sel">— CHOISIS TON COMBATTANT·E —</div>
          <div className="cmb-vs">
            <div className="cmb-fighter">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/combat/karateka.jpg" alt="Karatéka en garde, style arcade rétro" />
              <div className="cmb-meta">
                <div className="cmb-name">LÉA <small>KARATÉ</small></div>
                <div className="cmb-hp"><i style={{ width: "100%" }} /></div>
                <div className="cmb-fstat">licence signée en 2 min</div>
              </div>
            </div>
            <div className="cmb-vsbadge cmb-blink">VS</div>
            <div className="cmb-fighter">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/combat/boxeur.jpg" alt="Boxeur en garde, style arcade rétro" />
              <div className="cmb-meta">
                <div className="cmb-name">SAM <small>BOXE</small></div>
                <div className="cmb-hp"><i style={{ width: "100%" }} /></div>
                <div className="cmb-fstat">cotisation encaissée · 0 %</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 30, paddingBottom: 8 }}>
            <Link href="/creer" className="cmb-cta cmb-blink">▶ INSÉRER UNE PIÈCE — CRÉER MON CLUB</Link>
          </div>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">SELECT · 4 NIVEAUX_</p>
          <h2 className="cmb-h2">Ton club en ligne en 4 niveaux.</h2>
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

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">BONUS STAGE · MERCREDI 18H30_</p>
          <h2 className="cmb-h2">18 h 30. Le club ouvre.</h2>
          <div className="cmb-ko">
            <div className="a">
              <p className="px" style={{ fontSize: 9, color: "#8fae9e" }}>AVANT</p>
              <ul style={{ marginTop: 16, padding: 0 }}>
                <li>5 SMS</li><li>3 mails</li><li>17 dossiers papier</li><li>2 chèques</li><li>1 tableur</li>
              </ul>
            </div>
            <div className="b">
              <div className="kox">K.O.</div>
              <div className="n">1 notification<span style={{ color: "var(--grn)" }}>.</span></div>
              <p style={{ fontSize: 19, color: "#8fae9e", marginTop: 8 }}>C’est tout.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">FIGHTERS_</p>
          <h2 className="cmb-h2">Peu importe ta discipline.</h2>
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
          <h2 className="cmb-h2">Je n’ai pas inventé Klubster. J’en avais besoin.</h2>
          <p className="cmb-lead">
            Plus de quinze ans à faire vivre des associations. Neuf ans au bureau d’un club de boxe, puis fondateur et président de l’USM Boxe Anglaise depuis quatre ans. Des licences à saisir, des certificats à relancer, des chèques à encaisser un mercredi soir après l’entraînement.
          </p>
          <p className="cmb-lead">Klubster, c’est l’outil que j’aurais voulu avoir. Je l’ai construit depuis mon club — pour le mien d’abord, puis pour tous les autres.</p>
          <p className="cmb-sign">MATHIEU BOURDIEU — PRÉSIDENT-FONDATEUR, USM BOXE ANGLAISE<span className="cmb-cur">_</span></p>
        </div>
      </section>

      <section className="cmb-sec">
        <div className="cmb-shell">
          <p className="cmb-kick">CONTINUE?_</p>
          <h2 className="cmb-h2">Un seul Klubster. Le prix suit ta taille.</h2>
          <div className="cmb-tiers">
            {TIERS.map(([sz, pr]) => (
              <div className="cmb-tier" key={sz}>
                <div className="sz">{sz}</div>
                <div className="pr">{pr}</div>
                <div className="mo">/ mois</div>
              </div>
            ))}
          </div>
          <ul className="cmb-inc">
            {INCLUS.map((i) => (
              <li key={i}><b>✓</b> {i}</li>
            ))}
          </ul>
          <p style={{ marginTop: 20, fontSize: 18, color: "#6f8c7d" }}>
            Les paiements arrivent direct sur ton compte Stripe. Klubster ne prélève aucune commission. Sans engagement.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link href="/creer" className="cmb-cta cmb-blink">▶ PRESS START — CRÉER MON CLUB</Link>
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
