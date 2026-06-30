import LegalShell from "@/components/site/LegalShell";

export const metadata = { title: "Mentions légales — Klubster" };

export default function MentionsLegales() {
  return (
    <LegalShell kicker="LÉGAL" titre="Mentions légales" maj="30 juin 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site et le service <strong>Klubster</strong> sont édités par <strong>Mathieu Bourdieu</strong>,
        entrepreneur individuel, dont le siège est situé <strong>652 chemin de Foumezous, 82370 Corbarieu</strong> (France),
        immatriculé sous le numéro <strong>SIRET 795&nbsp;109&nbsp;198&nbsp;00023</strong> (SIREN 795&nbsp;109&nbsp;198).
      </p>
      <ul>
        <li>Directeur de la publication : Mathieu Bourdieu</li>
        <li>Contact : <a href="mailto:contact@klubster.fr">contact@klubster.fr</a></li>
        <li>TVA : [à compléter — n° de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI » en cas de franchise en base]</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Les données applicatives (base de données, authentification, fichiers) sont hébergées par
        <strong> Supabase</strong>, sur l’infrastructure d’<strong>Amazon Web Services</strong>, au sein de
        l’Union européenne (région Europe, Irlande). L’application web est déployée et servie par
        <strong> Vercel Inc.</strong> Les paiements sont opérés par <strong>Stripe</strong>.
      </p>
      <ul>
        <li>Supabase — Supabase, Inc., 970 Toa Payoh North, Singapour / infrastructure AWS UE.</li>
        <li>Vercel — Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</li>
        <li>Stripe — Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin, Irlande.</li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque Klubster, le logo, le code, les textes et l’identité visuelle sont protégés et demeurent
        la propriété exclusive de l’éditeur. Toute reproduction sans autorisation est interdite. Les
        contenus déposés par chaque club (logo, photos, textes) restent la propriété de ce club.
      </p>

      <h2>Responsabilité</h2>
      <p>
        L’éditeur s’efforce d’assurer l’exactitude des informations et la disponibilité du service, sans
        garantie d’absence d’interruption. Les contenus publiés par les clubs relèvent de leur seule
        responsabilité.
      </p>

      <h2>Médiation & litiges</h2>
      <p>
        Conformément au Code de la consommation, en cas de litige, un médiateur de la consommation peut être
        saisi : [NOM ET COORDONNÉES DU MÉDIATEUR]. Le présent site est soumis au droit français.
      </p>
    </LegalShell>
  );
}
