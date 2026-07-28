import LegalShell from "@/components/site/LegalShell";

export const metadata = {
  title: "Mentions légales — Klubster",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  return (
    <LegalShell kicker="LÉGAL" titre="Mentions légales" maj="28 juillet 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site et le service <strong>Klubster</strong> sont édités par <strong>Mathieu Bourdieu</strong>,
        entrepreneur individuel, dont le siège est situé <strong>652 chemin de Foumezous, 82370 Corbarieu</strong> (France),
        immatriculé sous le numéro <strong>SIRET 795&nbsp;109&nbsp;198&nbsp;00023</strong> (SIREN 795&nbsp;109&nbsp;198).
      </p>
      <ul>
        <li>Directeur de la publication : Mathieu Bourdieu</li>
        <li>Contact : <a href="mailto:contact@klubster.fr">contact@klubster.fr</a></li>
        <li>Téléphone : <a href="tel:+33631838417">06 31 83 84 17</a></li>
        <li>TVA non applicable — article 293 B du CGI (franchise en base). Les tarifs affichés sont des tarifs nets.</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Conformément à l’article 1-1 de la loi du 21 juin 2004 pour la confiance dans l’économie numérique,
        l’hébergeur du site est distingué des prestataires assurant le stockage des données traitées.
      </p>
      <p>
        <strong>Hébergeur du site.</strong> L’application web est déployée et servie par <strong>Vercel Inc.</strong>,
        440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Vercel ne publie pas de ligne téléphonique
        de contact ; le prestataire est joignable via <a href="https://vercel.com/contact">vercel.com/contact</a> et
        à l’adresse <a href="mailto:privacy@vercel.com">privacy@vercel.com</a>.
      </p>
      <p>
        <strong>Stockage des données traitées.</strong> Les données applicatives (base de données,
        authentification, fichiers) sont hébergées par <strong>Supabase, Inc.</strong>, sur l’infrastructure
        d’<strong>Amazon Web Services</strong>, au sein de l’Union européenne (région Europe, Irlande).
        Supabase ne publie pas de ligne téléphonique de contact ; le prestataire est joignable via
        <a href="https://supabase.com/contact-us"> supabase.com/contact-us</a> et à l’adresse
        <a href="mailto:privacy@supabase.com"> privacy@supabase.com</a>.
      </p>
      <p>
        <strong>Paiements.</strong> Les paiements sont opérés par <strong>Stripe Payments Europe, Ltd.</strong>,
        1 Grand Canal Street Lower, Dublin 2, Irlande.
      </p>

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

      <h2>Litiges</h2>
      <p>
        Le service Klubster s’adresse à des associations dans le cadre de leur activité, et non à des
        consommateurs : le dispositif de médiation de la consommation ne s’applique donc pas. Le présent
        site est soumis au droit français ; à défaut d’accord amiable, le litige relève des juridictions
        compétentes.
      </p>
    </LegalShell>
  );
}
