import LegalShell from "@/components/site/LegalShell";

export const metadata = { title: "Conditions générales de vente — Klubster" };

export default function CGV() {
  return (
    <LegalShell kicker="LÉGAL" titre="Conditions générales de vente" maj="30 juin 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions (« CGV ») encadrent l’abonnement au service Klubster souscrit par une
        association (le « Club »). La souscription vaut acceptation des CGV et du
        <a href="/sous-traitance"> contrat de sous-traitance</a>.
      </p>

      <h2>2. Offres et prix</h2>
      <p>
        L’abonnement est mensuel, sans commission sur les cotisations encaissées par le Club. Il n’existe
        qu’une seule offre : toutes les fonctionnalités sont incluses, et seul le nombre d’adhérents fait
        évoluer le tarif.
      </p>
      <ul>
        <li><strong>9 €/mois</strong> — jusqu’à 300 adhérents.</li>
        <li><strong>19 €/mois</strong> — de 301 à 500 adhérents.</li>
        <li><strong>29 €/mois</strong> — plus de 500 adhérents.</li>
      </ul>
      <p>Prix hors taxes le cas échéant. L’éditeur peut faire évoluer ses tarifs avec un préavis raisonnable.</p>

      <h2>3. Souscription</h2>
      <p>
        La souscription s’effectue en ligne, à la création du club, par acceptation expresse des présentes.
        L’abonnement débute à l’activation du compte.
      </p>

      <h2>4. Paiement et frais Stripe</h2>
      <p>
        L’abonnement Klubster est facturé par l’éditeur. <strong>Les cotisations des adhérents arrivent
        directement sur le compte Stripe du Club : Klubster ne prélève aucune commission dessus.</strong> Les
        frais de traitement Stripe (1,5 % + 0,25 € par transaction de carte européenne, à titre indicatif)
        sont facturés directement par Stripe et sont indépendants de l’abonnement Klubster.
      </p>

      <h2>5. Durée, résiliation, changement d’offre</h2>
      <p>
        L’abonnement est sans engagement. Le Club peut changer d’offre ou résilier à tout moment depuis son
        espace ; la résiliation prend effet à la fin de la période en cours, sans remboursement du mois
        entamé. À la résiliation, le Club peut récupérer ses données (voir Politique de confidentialité).
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Le service étant souscrit par une association dans le cadre de son activité, le droit de rétractation
        des consommateurs ne s’applique pas. Le Club bénéficie néanmoins de la résiliation libre prévue au
        point 5.
      </p>

      <h2>7. Obligations de l’éditeur</h2>
      <p>
        L’éditeur fournit le service avec diligence, assure son hébergement au sein de l’Union européenne et
        met en œuvre des mesures de sécurité appropriées. Il agit en qualité de sous-traitant pour les
        données des adhérents.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        La responsabilité de l’éditeur est limitée aux dommages directs et plafonnée aux sommes versées au
        titre de l’abonnement sur les douze derniers mois. L’éditeur n’est pas responsable des contenus et
        décisions de gestion du Club.
      </p>

      <h2>9. Droit applicable</h2>
      <p>Les CGV sont régies par le droit français. À défaut d’accord amiable, le litige relève des juridictions compétentes.</p>
    </LegalShell>
  );
}
