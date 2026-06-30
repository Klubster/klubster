import LegalShell from "@/components/site/LegalShell";

export const metadata = { title: "Politique de confidentialité — Klubster" };

export default function Confidentialite() {
  return (
    <LegalShell kicker="LÉGAL" titre="Politique de confidentialité" maj="30 juin 2026">
      <h2>1. Deux rôles distincts</h2>
      <p>
        Klubster intervient sous deux qualités au sens du RGPD :
      </p>
      <ul>
        <li>
          <strong>Responsable de traitement</strong> pour les données des comptes dirigeants (présidents),
          la facturation et l’usage de la plateforme.
        </li>
        <li>
          <strong>Sous-traitant</strong> pour les données des adhérents, dont chaque club reste le
          responsable de traitement. Les modalités figurent dans le <a href="/sous-traitance">contrat de
          sous-traitance</a>.
        </li>
      </ul>

      <h2>2. Données traitées</h2>
      <ul>
        <li>Identité et contact (nom, prénom, email, téléphone) ;</li>
        <li>Données d’adhésion (cours, statut de paiement, pièces) ;</li>
        <li>Date de naissance et, pour les mineurs, données du représentant légal ;</li>
        <li>Données de santé issues du questionnaire (catégorie particulière, art. 9 RGPD) — voir §6 ;</li>
        <li>Données techniques nécessaires à la sécurité (journaux, cookies d’authentification).</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fourniture du service et gestion des adhésions — exécution du contrat ;</li>
        <li>Facturation de l’abonnement — obligation légale et contrat ;</li>
        <li>Sécurité et prévention des abus — intérêt légitime ;</li>
        <li>Questionnaire de santé — consentement explicite et/ou intérêt légitime du club pour l’admission.</li>
      </ul>

      <h2>4. Destinataires et sous-traitants ultérieurs</h2>
      <p>Les données sont accessibles au club concerné et, en tant que prestataires techniques :</p>
      <ul>
        <li><strong>Supabase</strong> (base de données, authentification, stockage) — hébergement AWS, Union européenne ;</li>
        <li><strong>Vercel</strong> (hébergement applicatif) ;</li>
        <li><strong>Stripe</strong> (paiements) — aucune donnée bancaire n’est stockée par Klubster.</li>
      </ul>
      <p>Les données sont hébergées dans l’Union européenne. Aucun transfert hors UE n’est effectué sans garanties appropriées (clauses contractuelles types).</p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Données d’adhérent : pendant l’adhésion, puis archivage limité et suppression à l’issue d’un délai défini avec le club ;</li>
        <li>Attestation de santé : conservée pour la saison concernée, puis supprimée ;</li>
        <li>Données de facturation : durée légale de conservation comptable.</li>
      </ul>

      <h2>6. Données de santé et mineurs</h2>
      <p>
        Le questionnaire de santé remplace le certificat médical. Par minimisation, Klubster ne conserve que
        le <strong>résultat</strong> (attestation négative ou certificat requis), la signature et la date —
        <strong> et non le détail des réponses</strong>. Les données de mineurs sont saisies par le
        représentant légal. Ces traitements sensibles font l’objet de mesures de sécurité renforcées ; une
        analyse d’impact (AIPD) est conduite.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Cloisonnement par club (politiques d’accès au niveau de la base), chiffrement en transit (HTTPS) et au
        repos, contrôle des accès, sauvegardes. En cas de violation de données, les obligations de
        notification (72 h) sont appliquées.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Klubster n’utilise que des cookies strictement nécessaires à l’authentification. Aucun cookie
        publicitaire ni de mesure d’audience non essentiel n’est déposé sans consentement.
      </p>

      <h2>9. Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de
        portabilité. Pour les données détenues par un club, la demande s’adresse d’abord au club. Contact :
        <a href="mailto:[EMAIL]"> [EMAIL]</a>. Vous pouvez saisir la CNIL (www.cnil.fr).
      </p>
    </LegalShell>
  );
}
