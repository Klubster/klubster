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
        <li>Questionnaire de santé (donnée sensible, art. 9) — <strong>consentement explicite</strong> (art. 9.2.a), donné par le représentant légal pour un mineur.</li>
      </ul>

      <h2>4. Destinataires et sous-traitants ultérieurs</h2>
      <p>Les données sont accessibles au club concerné et, en tant que prestataires techniques :</p>
      <ul>
        <li><strong>Supabase</strong> (base de données, authentification, stockage) — hébergement AWS, Union européenne ;</li>
        <li><strong>Vercel</strong> (hébergement applicatif) — société américaine ;</li>
        <li><strong>Stripe</strong> (paiements, entité irlandaise) — aucune donnée bancaire n’est stockée par Klubster ;</li>
        <li><strong>Resend</strong> (envoi des emails : confirmation de compte, confirmation d’inscription, messages du club) — société américaine ;</li>
        <li><strong>Cloudflare</strong> (Turnstile — vérification anti-robot du formulaire d’inscription) — société américaine. Turnstile ne dépose aucun cookie publicitaire et ne sert pas au profilage ; il traite l’adresse IP et des signaux techniques du navigateur, le temps de la vérification.</li>
      </ul>
      <p>
        <strong>Vos données d’adhérents — dossiers, pièces, questionnaires de santé, paiements — sont stockées
        dans l’Union européenne</strong> (Irlande), et les traitements serveur s’exécutent à Paris. Trois
        prestataires sont établis aux États-Unis : Vercel, qui sert les pages du site, Resend, qui achemine
        les emails, et Cloudflare, qui vérifie que l’inscription n’est pas automatisée. Les transferts
        correspondants sont encadrés par les clauses contractuelles types de la Commission européenne.
      </p>

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
        représentant légal. La base légale est le <strong>consentement explicite</strong> (art. 9.2.a). Ces
        traitements sensibles font l’objet de mesures de sécurité renforcées et d’une analyse d’impact (AIPD).
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Cloisonnement par club (politiques d’accès au niveau de la base), chiffrement en transit (HTTPS) et au
        repos, contrôle des accès, sauvegardes. En cas de violation de données, les obligations de
        notification (72 h) sont appliquées.
      </p>

      <h2>8. Cookies et mesure d’audience</h2>
      <p>
        Le fonctionnement du service repose sur des cookies strictement nécessaires à l’authentification.
        Aucun cookie publicitaire n’est déposé, et Klubster ne pratique aucun profilage.
      </p>
      <p>
        Sur les <strong>pages de présentation de Klubster</strong> (accueil, tarifs, fonctionnalités, page
        de création d’association), et uniquement sur celles-ci, une mesure d’audience{" "}
        <strong>Microsoft Clarity</strong> permet de comprendre ce qui se lit mal ou décourage les
        visiteurs. Elle n’est activée <strong>qu’après votre accord</strong>, demandé par un bandeau où
        refuser est aussi simple qu’accepter, et votre refus est conservé. Microsoft Clarity est un service
        de Microsoft Corporation, société américaine ; les transferts s’appuient sur les clauses
        contractuelles types et le cadre de protection des données UE–États-Unis.
      </p>
      <p>
        <strong>Cette mesure ne s’applique jamais aux espaces des associations ni de leurs adhérents</strong>
        {" "}— sites des clubs, formulaires d’inscription, espaces adhérents, cockpits. Aucune donnée
        d’adhérent, aucun dossier et aucune donnée de santé n’est transmis à cet outil : les pages qui en
        contiennent sont exclues de la mesure par construction.
      </p>
      <p>
        Vous pouvez revenir sur votre choix à tout moment en effaçant les données de site de votre
        navigateur pour klubster.fr : le bandeau vous sera de nouveau proposé.
      </p>

      <h2>9. Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de
        portabilité. Pour les données détenues par un club, la demande s’adresse d’abord au club. Responsable :
        Mathieu Bourdieu (entrepreneur individuel), 652 chemin de Foumezous, 82370 Corbarieu — Contact :
        <a href="mailto:contact@klubster.fr"> contact@klubster.fr</a>. Vous pouvez saisir la CNIL (www.cnil.fr).
      </p>
    </LegalShell>
  );
}
