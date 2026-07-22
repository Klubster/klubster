// Gabarit HTML léger, aux couleurs du club. Volontairement minimal : un en-tête au nom
// du club, un corps, un bouton optionnel, un pied de page Klubster. Compatible avec les
// clients email (styles en ligne, tableaux, pas de CSS externe).
//
// On garde le texte brut en parallèle (paramètre `text` de envoyerEmail) pour les clients
// qui n'affichent pas le HTML et pour la délivrabilité.

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function gabaritEmail(opts: {
  club: string;
  couleur?: string | null;
  /** Titre affiché en gros dans le corps. */
  titre: string;
  /** Paragraphes du corps (texte simple, un <p> par entrée). */
  paragraphes: string[];
  /** Bouton d'action optionnel. */
  bouton?: { libelle: string; url: string } | null;
}): string {
  const couleur = opts.couleur && /^#[0-9a-fA-F]{6}$/.test(opts.couleur) ? opts.couleur : "#111111";
  const club = echapper(opts.club);
  const corps = opts.paragraphes
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1a1a">${echapper(p)}</p>`)
    .join("");
  const bouton = opts.bouton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="background:${couleur};border-radius:0">
         <a href="${echapper(opts.bouton.url)}" style="display:inline-block;padding:13px 26px;font-family:monospace;font-size:13px;letter-spacing:.04em;color:#ffffff;text-decoration:none">${echapper(opts.bouton.libelle)} →</a>
       </td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
        <tr><td style="border-top:3px solid ${couleur};padding:24px 28px 8px">
          <div style="font-family:monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6f6f6b">${club}</div>
        </td></tr>
        <tr><td style="padding:8px 28px 28px">
          <h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#111111">${echapper(opts.titre)}</h1>
          ${corps}
          ${bouton}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eeeeec">
          <div style="font-family:monospace;font-size:11px;color:#9a9a96">Envoyé par ${club} via Klubster · klubster.fr</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
