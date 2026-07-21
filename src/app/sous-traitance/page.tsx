import Link from "next/link";
import LegalShell from "@/components/site/LegalShell";

export const metadata = { title: "Contrat de sous-traitance (DPA) — Klubster" };

export default function SousTraitance() {
  return (
    <LegalShell kicker="LÉGAL · ARTICLE 28 RGPD" titre="Contrat de sous-traitance" maj="30 juin 2026">
      <p>
        Le présent accord (« DPA ») encadre le traitement, par Klubster (le « Sous-traitant »), des données
        personnelles pour le compte du club (le « Responsable de traitement »). Il est accepté par le club
        lors de la création de son compte et complète les <Link href="/cgv">CGV</Link>.
      </p>

      <h2>1. Objet et durée</h2>
      <p>
        Le Sous-traitant traite les données des adhérents du club aux seules fins de fournir le service
        Klubster. Le traitement dure le temps de l’abonnement, puis selon les modalités de l’article 8.
      </p>

      <h2>2. Nature du traitement</h2>
      <table>
        <tbody>
          <tr><th>Personnes concernées</th><td>Adhérents, représentants légaux des mineurs, dirigeants.</td></tr>
          <tr><th>Catégories de données</th><td>Identité, contact, adhésion/paiement, date de naissance, attestation de santé et signature.</td></tr>
          <tr><th>Opérations</th><td>Collecte, hébergement, organisation, consultation, conservation, suppression.</td></tr>
          <tr><th>Finalité</th><td>Gestion des inscriptions, des dossiers, des paiements et de la vie du club.</td></tr>
        </tbody>
      </table>

      <h2>3. Instructions</h2>
      <p>
        Le Sous-traitant ne traite les données que sur instructions documentées du Responsable, telles que
        matérialisées par l’usage du service, sauf obligation légale.
      </p>

      <h2>4. Confidentialité et sécurité</h2>
      <p>
        Le Sous-traitant garantit la confidentialité (personnes autorisées tenues à un engagement de
        confidentialité) et met en œuvre des mesures techniques et organisationnelles appropriées :
        cloisonnement par club, chiffrement en transit et au repos, contrôle des accès, journalisation,
        sauvegardes.
      </p>

      <h2>5. Sous-traitants ultérieurs</h2>
      <p>Le Responsable autorise le recours aux sous-traitants ultérieurs suivants, situés dans l’UE ou présentant des garanties appropriées :</p>
      <ul>
        <li>Supabase / AWS (hébergement base de données, authentification, stockage — Union européenne) ;</li>
        <li>Vercel Inc. (hébergement applicatif — États-Unis, clauses contractuelles types) ;</li>
        <li>Stripe (paiements — Irlande) ;</li>
        <li>Resend Inc. (envoi des emails transactionnels : confirmation de compte, confirmation d’inscription, messages du club à ses adhérents — États-Unis, clauses contractuelles types). Les données transmises se limitent à l’adresse email, au nom et au contenu du message.</li>
        <li>Cloudflare Inc. (Turnstile — protection du formulaire d’inscription contre les robots et les abus — États-Unis, clauses contractuelles types). Les données transmises se limitent à l’adresse IP et à des signaux techniques du navigateur, le temps de la vérification. Aucun cookie publicitaire, aucun profilage.</li>
      </ul>
      <p>Toute modification est portée à la connaissance du Responsable, qui peut s’y opposer pour un motif légitime.</p>

      <h2>6. Assistance</h2>
      <p>
        Le Sous-traitant aide le Responsable à répondre aux demandes d’exercice des droits des personnes, à
        garantir la sécurité, à notifier les violations et, le cas échéant, à réaliser une analyse d’impact
        (AIPD).
      </p>

      <h2>7. Violation de données</h2>
      <p>
        Le Sous-traitant notifie au Responsable toute violation de données dans les meilleurs délais après en
        avoir pris connaissance, avec les informations utiles pour permettre, si nécessaire, la notification à
        la CNIL sous 72 heures.
      </p>

      <h2>8. Sort des données en fin de contrat</h2>
      <p>
        À la fin de la prestation, le Sous-traitant, au choix du Responsable, restitue puis supprime les
        données (export disponible), sauf obligation légale de conservation.
      </p>

      <h2>9. Audit</h2>
      <p>
        Le Sous-traitant met à disposition les informations nécessaires pour démontrer le respect de
        l’article 28 et permet des audits raisonnables.
      </p>

      <h2>10. Localisation</h2>
      <p>Les données sont hébergées dans l’Union européenne. Aucun transfert hors UE n’est réalisé sans garanties appropriées (clauses contractuelles types).</p>
    </LegalShell>
  );
}
