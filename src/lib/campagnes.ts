import { envoyerLotCampagne } from "@/lib/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Envoi d'une campagne manuelle, du côté serveur.
 *
 * ORDRE VOLONTAIRE — la campagne et TOUS ses destinataires sont écrits en base avant le
 * moindre appel à Resend. Si l'envoi casse en cours de route, ou si le processus meurt
 * entre deux lots, la campagne reste inspectable et l'on sait exactement qui a été servi
 * et qui ne l'a pas été. L'inverse (envoyer d'abord, enregistrer ensuite) perdrait
 * précisément l'information qui compte le jour d'un incident.
 *
 * Une ligne ne passe à `accepte` qu'APRÈS que son identifiant Resend a été enregistré :
 * sans identifiant, aucun événement de webhook ne pourrait la rattraper, et la compter
 * comme acceptée serait mentir.
 */

export const TAILLE_LOT = 100; // maximum imposé par l'API batch de Resend

export type ResultatCampagne = {
  ok: boolean;
  campaignId: string | null;
  destinataires: number;
  acceptes: number;
  statut: "envoye" | "partiel" | "echec" | "preparation";
  erreur?: string;
};

export async function envoyerCampagne(opts: {
  supabase: SupabaseClient;
  organisationId: string;
  nomClub: string;
  replyTo: string | null;
  auteurProfileId: string | null;
  auteurNom: string | null;
  groupe: string;
  groupeLibelle: string;
  objet: string;
  corps: string;
  /** Cibles déjà recalculées et dédoublonnées CÔTÉ SERVEUR par l'appelant. */
  cibles: Array<{ adherentId: string | null; email: string }>;
}): Promise<ResultatCampagne> {
  const { supabase } = opts;

  if (opts.cibles.length === 0) {
    return { ok: false, campaignId: null, destinataires: 0, acceptes: 0, statut: "echec", erreur: "Aucun destinataire avec un email." };
  }

  // 1 — La campagne, en préparation.
  const { data: campagne, error: eCamp } = await supabase
    .from("message_campaigns")
    .insert({
      organisation_id: opts.organisationId,
      auteur_profile_id: opts.auteurProfileId,
      auteur_nom: opts.auteurNom,
      objet: opts.objet,
      corps: opts.corps,
      groupe: opts.groupe,
      groupe_libelle: opts.groupeLibelle,
      statut: "preparation",
      nombre_destinataires: opts.cibles.length,
    })
    .select("id")
    .single();

  if (eCamp || !campagne) {
    return { ok: false, campaignId: null, destinataires: 0, acceptes: 0, statut: "echec", erreur: "Impossible d’enregistrer la campagne." };
  }
  const campaignId = (campagne as { id: string }).id;

  // 2 — Les destinataires, photographiés maintenant.
  const { data: lignes, error: eDest } = await supabase
    .from("message_recipients")
    .insert(
      opts.cibles.map((c) => ({
        campaign_id: campaignId,
        organisation_id: opts.organisationId,
        adherent_id: c.adherentId,
        email: c.email,
        statut: "prepare",
      }))
    )
    .select("id, email");

  if (eDest || !lignes?.length) {
    await supabase
      .from("message_campaigns")
      .update({ statut: "echec", derniere_erreur: "Enregistrement des destinataires impossible.", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { ok: false, campaignId, destinataires: 0, acceptes: 0, statut: "echec", erreur: "Impossible d’enregistrer les destinataires." };
  }

  const destinataires = lignes as Array<{ id: string; email: string }>;
  await supabase.from("message_campaigns").update({ statut: "en_cours" }).eq("id", campaignId);

  // 3 — Les lots.
  let acceptes = 0;
  let derniereErreur: string | undefined;

  for (let i = 0; i < destinataires.length; i += TAILLE_LOT) {
    const tranche = destinataires.slice(i, i + TAILLE_LOT);
    const numeroLot = Math.floor(i / TAILLE_LOT) + 1;

    const res = await envoyerLotCampagne({
      nomClub: opts.nomClub,
      replyTo: opts.replyTo,
      objet: opts.objet,
      texte: opts.corps,
      lot: tranche.map((d) => ({ destinataireId: d.id, to: d.email })),
      campaignId,
      organisationId: opts.organisationId,
      numeroLot,
    });

    if (!res.ok) {
      derniereErreur = res.erreur;
      // Les destinataires de ce lot et des suivants restent en `prepare` : ils n'ont pas
      // été acceptés, et l'écran doit pouvoir le dire. On s'arrête — insister sur un
      // quota ne ferait qu'empiler les refus.
      break;
    }

    // 4 — Un identifiant enregistré, PUIS le statut.
    for (const d of tranche) {
      const id = res.identifiants.get(d.id);
      if (!id) continue; // pas d'identifiant : la ligne reste `prepare`, honnêtement
      const { error } = await supabase
        .from("message_recipients")
        .update({ provider_message_id: id, statut: "accepte", accepted_at: new Date().toISOString() })
        .eq("id", d.id);
      if (!error) acceptes += 1;
    }
  }

  // 5 — L'état global, dérivé de ce qui s'est réellement passé.
  const statut: ResultatCampagne["statut"] =
    acceptes === 0 ? "echec" : acceptes < destinataires.length ? "partiel" : "envoye";

  await supabase
    .from("message_campaigns")
    .update({
      statut,
      nombre_acceptes: acceptes,
      derniere_erreur: derniereErreur ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return {
    ok: acceptes > 0,
    campaignId,
    destinataires: destinataires.length,
    acceptes,
    statut,
    erreur: derniereErreur,
  };
}
