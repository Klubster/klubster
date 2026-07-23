import Link from "next/link";
import LegalShell from "@/components/site/LegalShell";

export const metadata = {
  title: "Conditions générales d’utilisation — Klubster",
  alternates: { canonical: "/cgu" },
};

export default function CGU() {
  return (
    <LegalShell kicker="LÉGAL" titre="Conditions générales d’utilisation" maj="30 juin 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions (« CGU ») régissent l’accès et l’utilisation de la plateforme Klubster, qui
        permet aux associations sportives de gérer leur site, leurs inscriptions, leurs paiements et leurs
        adhérents. En utilisant le service, l’utilisateur accepte les CGU.
      </p>

      <h2>2. Compte</h2>
      <p>
        L’accès aux espaces de gestion nécessite la création d’un compte. L’utilisateur garantit l’exactitude
        des informations fournies et la confidentialité de ses identifiants. Il est responsable des actions
        réalisées depuis son compte.
      </p>

      <h2>3. Utilisation conforme</h2>
      <p>L’utilisateur s’engage à ne pas :</p>
      <ul>
        <li>publier de contenu illicite, diffamatoire ou portant atteinte aux droits de tiers ;</li>
        <li>tenter d’accéder à des données qui ne lui appartiennent pas ;</li>
        <li>perturber le fonctionnement du service ou contourner ses mesures de sécurité.</li>
      </ul>

      <h2>4. Données et confidentialité</h2>
      <p>
        Le traitement des données personnelles est décrit dans la <Link href="/confidentialite">Politique de
        confidentialité</Link>. Lorsqu’un club gère les données de ses adhérents via Klubster, les rôles
        respectifs sont précisés dans le <Link href="/sous-traitance">contrat de sous-traitance</Link>.
      </p>

      <h2>5. Disponibilité</h2>
      <p>
        Klubster met en œuvre les moyens raisonnables pour assurer la continuité du service mais ne garantit
        pas une disponibilité ininterrompue (maintenance, incidents, dépendances tierces).
      </p>

      <h2>6. Propriété intellectuelle</h2>
      <p>
        La plateforme reste la propriété de l’éditeur. Les contenus publiés par un club restent la propriété
        de ce club, qui concède à Klubster une licence d’hébergement et d’affichage strictement nécessaire au
        service.
      </p>

      <h2>7. Résiliation</h2>
      <p>
        L’utilisateur peut fermer son compte à tout moment. L’éditeur peut suspendre un compte en cas de
        manquement aux CGU. Les conditions commerciales figurent dans les <Link href="/cgv">CGV</Link>.
      </p>

      <h2>8. Droit applicable</h2>
      <p>Les CGU sont soumises au droit français. Tout litige relève des juridictions compétentes.</p>
    </LegalShell>
  );
}
