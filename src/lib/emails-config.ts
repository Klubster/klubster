// Préférences d'emails automatiques d'un club, avec leurs valeurs par défaut.
//
// Chaque club peut désactiver ce qu'il ne veut pas depuis son cockpit. Les clés absentes
// prennent le défaut ci-dessous : un club qui n'a jamais touché à ces réglages reçoit la
// configuration recommandée.

export interface EmailsConfig {
  /** Rappel à l'adhérent d'une pièce obligatoire manquante, 30 jours après l'inscription. */
  relance_pieces_30: boolean;
  /** Rappel supplémentaire à 60 jours (désactivé par défaut : à activer par le club). */
  relance_pieces_60: boolean;
  /** Rappel supplémentaire à 90 jours (désactivé par défaut). */
  relance_pieces_90: boolean;
  /** Relance automatique des cotisations impayées (J+7, J+21, J+45, puis stop). */
  relance_impaye: boolean;
  /** Récapitulatif hebdomadaire envoyé au club le lundi. */
  recap_hebdo: boolean;
}

export const EMAILS_CONFIG_DEFAUT: EmailsConfig = {
  relance_pieces_30: true,
  relance_pieces_60: false,
  relance_pieces_90: false,
  relance_impaye: true,
  recap_hebdo: true,
};

/** Fusionne la configuration stockée d'un club avec les défauts. */
export function lireEmailsConfig(brut: unknown): EmailsConfig {
  const c = (brut ?? {}) as Partial<EmailsConfig>;
  return {
    relance_pieces_30: c.relance_pieces_30 ?? EMAILS_CONFIG_DEFAUT.relance_pieces_30,
    relance_pieces_60: c.relance_pieces_60 ?? EMAILS_CONFIG_DEFAUT.relance_pieces_60,
    relance_pieces_90: c.relance_pieces_90 ?? EMAILS_CONFIG_DEFAUT.relance_pieces_90,
    relance_impaye: c.relance_impaye ?? EMAILS_CONFIG_DEFAUT.relance_impaye,
    recap_hebdo: c.recap_hebdo ?? EMAILS_CONFIG_DEFAUT.recap_hebdo,
  };
}

/** Libellés lisibles pour la page de réglages. */
export const EMAILS_LABELS: Record<keyof EmailsConfig, { titre: string; detail: string }> = {
  relance_pieces_30: {
    titre: "Rappel de pièce manquante (30 jours)",
    detail: "Un rappel à l'adhérent dont une pièce obligatoire manque encore un mois après son inscription.",
  },
  relance_pieces_60: {
    titre: "Rappel de pièce manquante (60 jours)",
    detail: "Un second rappel deux mois après l'inscription, si la pièce manque toujours.",
  },
  relance_pieces_90: {
    titre: "Rappel de pièce manquante (90 jours)",
    detail: "Un dernier rappel trois mois après l'inscription.",
  },
  relance_impaye: {
    titre: "Relance des cotisations impayées",
    detail: "Relance automatique et espacée (à une, trois, puis six semaines), qui s'arrête dès le règlement.",
  },
  recap_hebdo: {
    titre: "Récapitulatif hebdomadaire",
    detail: "Un email le lundi matin résumant les inscriptions, impayés et dossiers en attente. Jamais plus d'un par semaine.",
  },
};
