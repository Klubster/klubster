// Rôles bénévoles et permissions. La sécurité réelle est portée par la base (RLS + RPC) ;
// ces fonctions servent à masquer côté interface ce qu'un rôle ne peut pas faire.

export type RoleAsso = "admin_asso" | "tresorier" | "secretaire" | "encadrant" | "lecture";

export const ROLES: { cle: RoleAsso; label: string; desc: string }[] = [
  { cle: "admin_asso", label: "Président", desc: "Accès complet, y compris l’équipe et l’abonnement." },
  { cle: "tresorier", label: "Trésorier", desc: "Paiements, encaissements, remises. Pas les données de santé." },
  { cle: "secretaire", label: "Secrétaire", desc: "Adhérents, dossiers, pièces, santé, messages, site." },
  { cle: "encadrant", label: "Encadrant", desc: "Contrôle au scan et présences. Lecture des adhérents." },
  { cle: "lecture", label: "Lecture seule", desc: "Consultation, sans modification." },
];

export type Action = "paiements" | "sante" | "adherents_ecriture" | "controle" | "site" | "messages" | "equipe";

const MATRICE: Record<RoleAsso, Action[]> = {
  admin_asso: ["paiements", "sante", "adherents_ecriture", "controle", "site", "messages", "equipe"],
  tresorier: ["paiements"],
  secretaire: ["sante", "adherents_ecriture", "site", "messages"],
  encadrant: ["controle"],
  lecture: [],
};

export function peut(role: string | null | undefined, action: Action): boolean {
  if (role === "super_admin") return true;
  const r = role as RoleAsso;
  return (MATRICE[r] ?? []).includes(action);
}

export function libelleRole(role: string | null | undefined): string {
  return ROLES.find((r) => r.cle === role)?.label ?? "Membre";
}
