import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLES, peut } from "@/lib/roles";

/**
 * Cloisonnement des campagnes — par organisation ET par rôle.
 *
 * POURQUOI CE TEST EXISTE
 * La migration 0024 cloisonnait par organisation seulement : tout membre du club pouvait
 * lire `message_recipients`, c'est-à-dire le carnet d'adresses complet des adhérents
 * servis, par simple requête PostgREST — sans jamais passer par la page Next et son
 * `verifierPermission`. Un garde d'interface ne protège que l'interface.
 *
 * On vérifie ici que la politique SQL dit la MÊME chose que la matrice de rôles
 * TypeScript. Les deux définissent qui peut écrire aux adhérents ; si elles divergent,
 * c'est toujours la base qui a raison, et c'est toujours l'interface qui ment.
 */

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/0025_campagnes_rls_par_role_et_purge.sql"),
  "utf8"
);

/** Les rôles qui ont réellement la permission « messages », d'après le code. */
const AUTORISES = ROLES.filter((r) => peut(r.cle, "messages")).map((r) => r.cle);
const REFUSES = ROLES.filter((r) => !peut(r.cle, "messages")).map((r) => r.cle);

describe("RLS des campagnes — par rôle", () => {
  it("la matrice de rôles autorise bien le président et le secrétaire, et personne d’autre", () => {
    expect(AUTORISES.sort()).toEqual(["admin_asso", "secretaire"]);
    // Ceux-ci ne doivent jamais lire une campagne : le trésorier voit l'argent,
    // l'encadrant le tapis, la lecture seule rien du tout.
    expect(REFUSES).toContain("tresorier");
    expect(REFUSES).toContain("encadrant");
    expect(REFUSES).toContain("lecture");
  });

  it.each(["message_campaigns", "message_recipients"])(
    "%s : la politique de lecture exige un rôle autorisé, pas la seule appartenance au club",
    (table) => {
      const politique = SQL.match(
        new RegExp(`create policy \\w+ on public\\.${table} for select[\\s\\S]*?;`)
      )?.[0];
      expect(politique, `politique de lecture absente pour ${table}`).toBeTruthy();

      // Le cloisonnement par organisation reste exigé…
      expect(politique).toMatch(/organisation_id = current_org_id\(\)/);
      // …ET le rôle aussi. C'est le `and a_role_asso(...)` qui manquait en 0024.
      expect(politique).toMatch(/and a_role_asso\(/);

      for (const role of AUTORISES) expect(politique).toContain(`'${role}'`);
      for (const role of REFUSES) expect(politique).not.toContain(`'${role}'`);
    }
  );

  it.each(["message_campaigns", "message_recipients"])(
    "%s : les anciennes politiques trop larges sont explicitement retirées",
    (table) => {
      expect(SQL).toMatch(new RegExp(`drop policy if exists \\w+ on public\\.${table}`));
    }
  );

  it("aucune politique d’écriture n’est ouverte à authenticated", () => {
    // Les campagnes ne naissent que de la Server Action, en service_role. Un président
    // ne doit pas pouvoir forger une ligne portant l'organisation d'un autre club.
    expect(SQL).not.toMatch(/for (insert|update|delete|all)/i);
  });

  it("la purge des adresses est révoquée des rôles clients", () => {
    expect(SQL).toMatch(/revoke execute on function public\.purger_destinataires_campagnes\(int\) from anon, authenticated, public/);
  });

  it("la durée de conservation par défaut est de 13 mois", () => {
    expect(SQL).toMatch(/purger_destinataires_campagnes\(p_mois int default 13\)/);
  });

  it("la purge efface l’adresse ET le lien vers l’adhérent, mais garde la ligne", () => {
    const fn = SQL.match(/create or replace function public\.purger_destinataires_campagnes[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/set email = null, adherent_id = null/);
    // Surtout pas de suppression : les compteurs de campagne doivent rester exacts.
    expect(fn).not.toMatch(/delete from/i);
  });
});

describe("purge branchée sur le cron d’entretien", () => {
  it("le cron quotidien appelle bien la purge des destinataires", () => {
    const cron = readFileSync(join(process.cwd(), "src/app/api/cron/relances/route.ts"), "utf8");
    expect(cron).toMatch(/purger_destinataires_campagnes/);
    // Aux côtés des purges existantes, dans le même bloc d'entretien non bloquant.
    expect(cron).toMatch(/purger_emails_journal/);
  });
});
