import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PALIERS, palierPourEffectif } from "@/lib/stripe";
import { compteConnecte, statutAbonnement } from "@/lib/stripe-org";
import type { Organisation } from "@/types/db";

/**
 * Données de la console plateforme (/admin).
 *
 * Lecture via le client serveur normal, donc soumise à la RLS : les politiques
 * `*_same_org` acceptent `is_super_admin()`, un super-admin voit donc tout sans
 * qu'on ait besoin de la clé service_role. C'est volontaire — un back-office qui
 * contourne la RLS est un back-office dont personne ne peut plus prouver les accès.
 *
 * L'agrégation se fait en TypeScript après avoir chargé les lignes. À l'échelle
 * actuelle (quelques clubs, quelques centaines d'adhésions) c'est immédiat et ça
 * évite d'ajouter des vues SQL non versionnées. Au-delà de ~50 000 adhésions, il
 * faudra basculer sur une RPC d'agrégation côté Postgres : voir PLAFOND ci-dessous.
 */
const PLAFOND = 50_000;

export type StatutAbo = "actif" | "essai" | "impaye" | "resilie" | "aucun";

export interface ClubAdmin {
  id: string;
  nom: string;
  slug: string;
  creeLe: string;
  publie: boolean;
  sport: string | null;
  domaineCustom: string | null;
  /** Adhérents de la saison en cours (adhésions), pas la base historique. */
  adherents: number;
  cours: number;
  /** Ce que le club a encaissé via Klubster, tous moyens de paiement confondus. */
  encaisseCentimes: number;
  /** Ce qui reste dû à ce club par ses adhérents. */
  resteDuCentimes: number;
  statutAbo: StatutAbo;
  /** Prix mensuel correspondant à l'effectif — ce que le club paie, ou paierait. */
  prixMensuelCentimes: number;
  /** Compté dans le MRR seulement si l'abonnement est actif. */
  mrrCentimes: number;
  stripeConnecte: boolean;
  essaiFin: string | null;
  president: { email: string | null; prenom: string | null; nom: string | null } | null;
  /** Dernier signe de vie : inscription, encaissement ou présence. */
  derniereActivite: string | null;
}

export interface StatsAdmin {
  clubs: ClubAdmin[];
  total: number;
  publies: number;
  mrrCentimes: number;
  arrCentimes: number;
  abonnesActifs: number;
  enEssai: number;
  impayes: number;
  resilies: number;
  adherentsTotal: number;
  encaisseTotalCentimes: number;
  /** Clubs créés il y a moins de 30 jours. */
  nouveaux30j: number;
  /** Adhésions enregistrées sur les 30 derniers jours, tous clubs confondus. */
  inscriptions30j: number;
  /** Clubs créés par semaine, 12 dernières semaines, du plus ancien au plus récent. */
  creationsParSemaine: { debut: string; n: number }[];
  alertes: {
    essaiBientotFini: ClubAdmin[];
    impayes: ClubAdmin[];
    jamaisPublies: ClubAdmin[];
    sansAdherent: ClubAdmin[];
    sansStripe: ClubAdmin[];
    dormants: ClubAdmin[];
  };
  /** Vrai si un plafond a été atteint : les chiffres sont alors partiels. */
  tronque: boolean;
}

function jours(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function plusRecent(...dates: (string | null | undefined)[]): string | null {
  const valides = dates.filter((d): d is string => !!d);
  if (valides.length === 0) return null;
  return valides.sort().at(-1) ?? null;
}

/** Garde d'accès : renvoie null si la personne n'est pas super-admin. */
export async function verifierSuperAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "super_admin") return null;
  return profile;
}

export async function getStatsAdmin(): Promise<StatsAdmin> {
  const supabase = await createSupabaseServerClient();

  const [orgsRes, adhesionsRes, reglementsRes, coursRes, profilsRes, presencesRes] = await Promise.all([
    supabase.from("organisations").select("*").order("created_at", { ascending: false }).limit(PLAFOND),
    supabase.from("adhesions").select("id, organisation_id, montant_centimes, statut, created_at").limit(PLAFOND),
    supabase.from("reglements").select("organisation_id, montant_centimes, created_at").limit(PLAFOND),
    supabase.from("cours").select("id, organisation_id").limit(PLAFOND),
    supabase.from("profiles").select("email, prenom, nom, organisation_id, role, created_at").limit(PLAFOND),
    supabase.from("presences").select("organisation_id, created_at").limit(PLAFOND),
  ]);

  const orgs = (orgsRes.data ?? []) as Organisation[];
  const adhesions = adhesionsRes.data ?? [];
  const reglements = reglementsRes.data ?? [];
  const cours = coursRes.data ?? [];
  const profils = profilsRes.data ?? [];
  const presences = presencesRes.data ?? [];

  const tronque = [adhesions, reglements, cours, presences].some((t) => t.length >= PLAFOND);

  // Index par organisation — une seule passe sur chaque table.
  const parOrg = <T extends { organisation_id: string | null }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      if (!r.organisation_id) continue;
      const arr = m.get(r.organisation_id);
      if (arr) arr.push(r);
      else m.set(r.organisation_id, [r]);
    }
    return m;
  };
  const adhesionsPar = parOrg(adhesions);
  const reglementsPar = parOrg(reglements);
  const coursPar = parOrg(cours);
  const presencesPar = parOrg(presences);
  // Le référent d'un club, c'est son président. Mais l'éditeur lui-même est rattaché à
  // son propre club tout en portant le rôle super_admin : sans ce second passage, son
  // club apparaîtrait sans contact, ou pire avec un compte de test comme référent.
  // On prend donc le président, et à défaut le super-admin rattaché.
  const presidentPar = new Map<string, { email: string | null; prenom: string | null; nom: string | null }>();
  for (const role of ["admin_asso", "super_admin"]) {
    for (const p of profils) {
      if (p.role !== role || !p.organisation_id) continue;
      if (!presidentPar.has(p.organisation_id)) {
        presidentPar.set(p.organisation_id, { email: p.email, prenom: p.prenom, nom: p.nom });
      }
    }
  }

  const il30j = jours(30).toISOString();

  const clubs: ClubAdmin[] = orgs.map((org) => {
    const a = adhesionsPar.get(org.id) ?? [];
    const r = reglementsPar.get(org.id) ?? [];
    const encaisse = r.reduce((s, x) => s + (x.montant_centimes ?? 0), 0);
    const du = a.reduce((s, x) => s + (x.montant_centimes ?? 0), 0);
    const statut = statutAbonnement(org) as StatutAbo;
    const prix = PALIERS[palierPourEffectif(a.length)].prixCentimes;
    return {
      id: org.id,
      nom: org.nom,
      slug: org.slug,
      creeLe: org.created_at,
      publie: !!org.publie,
      sport: org.sport ?? null,
      domaineCustom: org.domaine_custom ?? null,
      adherents: a.length,
      cours: (coursPar.get(org.id) ?? []).length,
      encaisseCentimes: encaisse,
      resteDuCentimes: Math.max(0, du - encaisse),
      statutAbo: statut,
      prixMensuelCentimes: prix,
      mrrCentimes: statut === "actif" ? prix : 0,
      stripeConnecte: !!compteConnecte(org),
      essaiFin: org.abonnement_essai_fin ?? null,
      president: presidentPar.get(org.id) ?? null,
      derniereActivite: plusRecent(
        a.map((x) => x.created_at).sort().at(-1),
        r.map((x) => x.created_at).sort().at(-1),
        (presencesPar.get(org.id) ?? []).map((x) => x.created_at).sort().at(-1)
      ),
    };
  });

  // Créations par semaine sur 12 semaines — lecture de la dynamique d'acquisition.
  const creationsParSemaine: { debut: string; n: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const debut = jours((i + 1) * 7);
    const fin = jours(i * 7);
    creationsParSemaine.push({
      debut: debut.toISOString(),
      n: clubs.filter((c) => c.creeLe >= debut.toISOString() && c.creeLe < fin.toISOString()).length,
    });
  }

  const dans7j = jours(-7).toISOString();
  const maintenant = new Date().toISOString();

  return {
    clubs,
    total: clubs.length,
    publies: clubs.filter((c) => c.publie).length,
    mrrCentimes: clubs.reduce((s, c) => s + c.mrrCentimes, 0),
    arrCentimes: clubs.reduce((s, c) => s + c.mrrCentimes, 0) * 12,
    abonnesActifs: clubs.filter((c) => c.statutAbo === "actif").length,
    enEssai: clubs.filter((c) => c.statutAbo === "essai").length,
    impayes: clubs.filter((c) => c.statutAbo === "impaye").length,
    resilies: clubs.filter((c) => c.statutAbo === "resilie").length,
    adherentsTotal: clubs.reduce((s, c) => s + c.adherents, 0),
    encaisseTotalCentimes: clubs.reduce((s, c) => s + c.encaisseCentimes, 0),
    nouveaux30j: clubs.filter((c) => c.creeLe >= il30j).length,
    inscriptions30j: adhesions.filter((a) => (a.created_at ?? "") >= il30j).length,
    creationsParSemaine,
    alertes: {
      // Un essai qui se termine sans carte enregistrée, c'est un client à appeler
      // maintenant — pas après la bascule.
      essaiBientotFini: clubs.filter(
        (c) => c.statutAbo === "essai" && c.essaiFin && c.essaiFin > maintenant && c.essaiFin <= dans7j
      ),
      impayes: clubs.filter((c) => c.statutAbo === "impaye"),
      jamaisPublies: clubs.filter((c) => !c.publie),
      // Publié mais aucun adhérent : l'activation a échoué quelque part.
      sansAdherent: clubs.filter((c) => c.publie && c.adherents === 0),
      // Sans Stripe, le club ne peut pas encaisser en ligne : plafond d'usage.
      sansStripe: clubs.filter((c) => c.publie && !c.stripeConnecte),
      // Aucun signe de vie depuis 30 jours alors que le club a des adhérents.
      dormants: clubs.filter(
        (c) => c.adherents > 0 && (!c.derniereActivite || c.derniereActivite < il30j)
      ),
    },
    tronque,
  };
}
