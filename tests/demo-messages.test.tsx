// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense, useEffect } from "react";
import { render, screen, act, within } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoMessages from "@/app/demo/messages/page";
import DemoCampagne from "@/app/demo/messages/[id]/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, type EtatDemo } from "@/lib/demo/etat";
import {
  compteursCampagne,
  destinatairesDuGroupe,
  groupesDisponibles,
  libelleArchive,
  quandCampagne,
} from "@/lib/demo/selecteurs";

/**
 * LA MESSAGERIE — le composeur, l'historique, le détail d'une campagne.
 *
 * CE QUE CES TESTS SURVEILLENT EN PRIORITÉ
 *
 * 1. Les adhérents SANS EMAIL n'entrent nulle part. C'est la règle la plus facile à
 *    perdre : elle tient à un `.filter(a => a.email)` dans le produit, et un compteur
 *    faux ici ferait promettre un envoi à quelqu'un qui ne recevrait jamais rien.
 * 2. « Accepté » n'exclut pas « distribué ». Le produit incrémente `nombre_acceptes` à
 *    l'envoi et n'y retouche plus ; compter les seules lignes RESTÉES au statut
 *    « accepté » afficherait « 0 accepté · 32 distribués ».
 * 3. Le libellé archivé du groupe « parents » n'est PAS celui du menu déroulant.
 * 4. Les ouvertures et les clics n'existent pas, et aucun écran ne doit les inventer.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/messages",
}));

let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => {
    vu = etat;
  }, [etat]);
  return null;
}

const monter = (ecran: React.ReactNode) =>
  render(
    <DemoLayout>
      {ecran}
      <Sonde />
    </DemoLayout>
  );

const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/**
 * Promesse déjà résolue : `use(params)` la lit sans suspendre.
 *
 * Sous horloge simulée, une vraie promesse en attente ne se réveillerait jamais — le
 * planificateur de React s'appuie sur des minuteurs, que `vi.useFakeTimers()` fige. Même
 * convention que `tests/demo-interactions.test.tsx`.
 */
function paramsResolus(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  p.status = "fulfilled";
  p.value = { id };
  return p;
}

/** Les `<select>` et `<input>` de React n'écoutent que le setter natif du prototype. */
const poser = (el: HTMLElement, valeur: string, prototype: { prototype: object }) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

const choisirGroupe = (valeur: string) =>
  poser(screen.getByLabelText("DESTINATAIRES"), valeur, window.HTMLSelectElement);
const taperObjet = (v: string) => poser(screen.getByLabelText("OBJET"), v, window.HTMLInputElement);
const taperMessage = (v: string) => poser(screen.getByLabelText("MESSAGE"), v, window.HTMLTextAreaElement);

const boutonEnvoi = () => screen.getByRole("button", { name: /SIMULER L’ENVOI/ }) as HTMLButtonElement;

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Les destinataires ————————————————————————————————————————————————————————

describe("le calcul des destinataires", () => {
  const base = creerEtatDemoInitial();

  it("exclut les adhérents sans email, et n'en compte donc pas 34", () => {
    const sansEmail = base.adherents.filter((a) => !a.email);
    // Le club en a au moins un : sans lui, ce test ne prouverait rien.
    expect(sansEmail.length).toBeGreaterThan(0);
    const emails = destinatairesDuGroupe(base, "tous");
    expect(emails.length).toBe(base.adherents.length - sansEmail.length);
    for (const a of sansEmail) expect(emails).not.toContain(a.email);
  });

  it("n'écrit qu'à des adresses en @example.com", () => {
    for (const e of destinatairesDuGroupe(base, "tous")) expect(e.endsWith("@example.com")).toBe(true);
  });

  it("dédoublonne les adresses partagées par deux adhérents", () => {
    // Une famille, une seule boîte : le produit garde le premier adhérent rencontré et
    // n'envoie qu'une fois. Le club de démonstration n'a pas ce cas — on le fabrique.
    const partagee = base.adherents[1].email as string;
    const etat: EtatDemo = {
      ...base,
      adherents: base.adherents.map((a, i) => (i === 2 ? { ...a, email: partagee } : a)),
    };
    const emails = destinatairesDuGroupe(etat, "tous");
    expect(emails.filter((e) => e === partagee).length).toBe(1);
  });

  it("rend zéro destinataire pour les mineurs — ce club n'en a pas", () => {
    expect(destinatairesDuGroupe(base, "parents")).toEqual([]);
  });

  it("compte les dossiers incomplets, et seulement ceux qui ont un email", () => {
    const emails = destinatairesDuGroupe(base, "incomplet");
    const attendu = base.adherents.filter(
      (a) => a.email && base.pieces.some((p) => p.adherent_id === a.id && p.statut !== "recue")
    );
    expect(emails.length).toBe(attendu.length);
    expect(emails.length).toBeGreaterThan(0);
  });

  it("restreint un groupe de cours à ses inscrits", () => {
    const cours = base.cours[0];
    const emails = destinatairesDuGroupe(base, cours.id);
    const inscrits = new Set(base.adhesions.filter((a) => a.cours_id === cours.id).map((a) => a.adherent_id));
    for (const e of emails) {
      const a = base.adherents.find((x) => x.email === e)!;
      expect(inscrits.has(a.id)).toBe(true);
    }
    expect(emails.length).toBeGreaterThan(0);
  });

  it("archive « Responsables légaux des mineurs » là où le menu dit « Parents »", () => {
    const g = groupesDisponibles(base).find((x) => x.valeur === "parents")!;
    expect(g.libelle).toBe("Parents (adhérents mineurs)");
    expect(g.archive).toBe("Responsables légaux des mineurs");
    expect(libelleArchive(base, "parents")).toBe("Responsables légaux des mineurs");
    // Les autres groupes archivent leur propre libellé.
    expect(libelleArchive(base, "tous")).toBe("Tous les adhérents");
    expect(libelleArchive(base, base.cours[0].id)).toBe(base.cours[0].nom);
  });
});

// ——— Les compteurs ————————————————————————————————————————————————————————————

describe("les compteurs d’une campagne", () => {
  it("compte un distribué parmi les acceptés, comme les colonnes réelles", () => {
    const n = compteursCampagne({
      destinataires: [
        { statut: "distribue" },
        { statut: "distribue" },
        { statut: "rejete" },
        { statut: "plainte" },
        { statut: "retarde" },
        { statut: "prepare" },
      ],
    });
    expect(n.destinataires).toBe(6);
    // Cinq lignes ont quitté « préparé » : elles ont donc toutes été acceptées.
    expect(n.acceptes).toBe(5);
    expect(n.distribues).toBe(2);
    expect(n.retardes).toBe(1);
    expect(n.echecs).toBe(1);
    // La plainte n'est PAS agrégée aux échecs.
    expect(n.plaintes).toBe(1);
  });

  it("range un échec et un rejet dans la même colonne", () => {
    const n = compteursCampagne({ destinataires: [{ statut: "echec" }, { statut: "rejete" }] });
    expect(n.echecs).toBe(2);
    expect(n.plaintes).toBe(0);
  });
});

describe("la date d’un message", () => {
  it("ne dépend pas du fuseau de la machine", () => {
    // L'instant porte son décalage : lu en Europe/Paris, il rend toujours 18 h 12.
    expect(quandCampagne("2026-10-14T18:12:00+02:00")).toBe("14 octobre à 18 h 12");
  });
});

// ——— L'écran ——————————————————————————————————————————————————————————————————

describe("le composeur", () => {
  it("affiche le nombre de destinataires avec un email", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoMessages />);
    const attendu = destinatairesDuGroupe(base, "tous").length;
    expect(screen.getByText(`${attendu} destinataires avec un email`)).toBeTruthy();
    expect(attendu).toBeLessThan(base.adherents.length);
  });

  it("propose les groupes dans l’ordre du produit, séparateur compris", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoMessages />);
    const options = Array.from(
      (screen.getByLabelText("DESTINATAIRES") as HTMLSelectElement).options
    ).map((o) => o.textContent);
    expect(options.slice(0, 4)).toEqual([
      "Tous les adhérents",
      "Parents (adhérents mineurs)",
      "Dossiers incomplets",
      "──────────",
    ]);
    // Le séparateur ne doit pas être sélectionnable.
    expect((screen.getByLabelText("DESTINATAIRES") as HTMLSelectElement).options[3].disabled).toBe(true);
    expect(options.slice(4)).toEqual(base.cours.map((c) => c.nom));
  });

  it("désactive l’envoi tant que les trois conditions ne sont pas réunies", () => {
    monter(<DemoMessages />);
    expect(boutonEnvoi().disabled).toBe(true);

    taperObjet("Reprise");
    expect(boutonEnvoi().disabled).toBe(true);

    // Un message fait d'espaces ne compte pas : le produit teste `message.trim()`.
    taperMessage("   ");
    expect(boutonEnvoi().disabled).toBe(true);

    taperMessage("Bonjour à toutes et à tous.");
    expect(boutonEnvoi().disabled).toBe(false);
  });

  it("désactive l’envoi sur un groupe vide, même objet et message remplis", () => {
    monter(<DemoMessages />);
    taperObjet("Réunion des parents");
    taperMessage("Bonjour,");
    expect(boutonEnvoi().disabled).toBe(false);

    choisirGroupe("parents");
    expect(screen.getByText("0 destinataire avec un email")).toBeTruthy();
    expect(boutonEnvoi().disabled).toBe(true);
    expect(screen.getByText(/n’a d’adresse email/)).toBeTruthy();
  });

  it("n’a pas de placeholder sur le message, et en a un sur l’objet", () => {
    monter(<DemoMessages />);
    expect((screen.getByLabelText("OBJET") as HTMLInputElement).placeholder).toBe(
      "Reprise des cours le 4 septembre"
    );
    expect((screen.getByLabelText("MESSAGE") as HTMLTextAreaElement).placeholder).toBe("");
  });

  it("n’ouvre ni la messagerie du visiteur ni son presse-papier", () => {
    monter(<DemoMessages />);
    // Aucun `mailto:` : c'est la décision prise pour l'écran des encaissements.
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    const boutons = Array.from(document.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(boutons.some((t) => /copier/i.test(t))).toBe(false);
  });
});

describe("l’envoi simulé", () => {
  it("crée la campagne, l’achemine, et laisse l’objet vide derrière lui", () => {
    const base = creerEtatDemoInitial();
    const attendu = destinatairesDuGroupe(base, "tous");
    monter(<DemoMessages />);

    taperObjet("Le studio ferme lundi");
    taperMessage("Bonjour à toutes et à tous.");
    act(() => boutonEnvoi().click());

    // Le bouton attend 450 ms avant d'agir : à 449, rien ne s'est produit.
    avancer(449);
    expect(vu!.campagnes.length).toBe(base.campagnes.length);
    avancer(1);

    expect(vu!.campagnes.length).toBe(base.campagnes.length + 1);
    const campagne = vu!.campagnes[0];
    expect(campagne.objet).toBe("Le studio ferme lundi");
    expect(campagne.groupe_libelle).toBe("Tous les adhérents");
    expect(campagne.destinataires.map((d) => d.email)).toEqual(attendu);
    expect(campagne.statut).toBe("en_cours");
    expect(campagne.destinataires.every((d) => d.statut === "prepare")).toBe(true);

    // Les champs sont vidés, comme après un envoi réussi dans le produit.
    expect((screen.getByLabelText("OBJET") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("MESSAGE") as HTMLTextAreaElement).value).toBe("");

    // Premier pas : acceptés. Second : distribués, et le statut se fige.
    avancer(900);
    expect(vu!.campagnes[0].destinataires.every((d) => d.statut === "accepte")).toBe(true);
    expect(vu!.campagnes[0].statut).toBe("en_cours");
    avancer(900);
    expect(vu!.campagnes[0].destinataires.some((d) => d.statut === "distribue")).toBe(true);
    expect(["envoye", "partiel"]).toContain(vu!.campagnes[0].statut);

    // Puis plus rien ne bouge : l'acheminement s'arrête tout seul.
    const fige = vu!.campagnes[0];
    avancer(5000);
    expect(vu!.campagnes[0]).toBe(fige);
  });

  it("archive le libellé du groupe, pas celui du menu", () => {
    monter(<DemoMessages />);
    choisirGroupe("incomplet");
    taperObjet("Il manque une pièce");
    taperMessage("Bonjour,");
    act(() => boutonEnvoi().click());
    avancer(450);
    expect(vu!.campagnes[0].groupe_libelle).toBe("Dossiers incomplets");
  });

  it("tronque l’objet à 150 caractères et le message à 10 000", () => {
    monter(<DemoMessages />);
    taperObjet("o".repeat(200));
    taperMessage("m".repeat(10500));
    act(() => boutonEnvoi().click());
    avancer(450);
    expect(vu!.campagnes[0].objet.length).toBe(150);
    expect(vu!.campagnes[0].corps.length).toBe(10000);
  });

  it("fait apparaître le message en tête de l’historique", () => {
    monter(<DemoMessages />);
    taperObjet("Atelier du dimanche");
    taperMessage("Bonjour,");
    act(() => boutonEnvoi().click());
    avancer(450);

    const liens = Array.from(document.querySelectorAll('a[href^="/demo/messages/"]'));
    expect(liens[0].textContent).toContain("Atelier du dimanche");
    expect(liens[0].textContent).toContain("Envoi en cours");
  });
});

describe("l’historique", () => {
  it("affiche les acceptés ET les distribués sur la même ligne", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoMessages />);
    const premiere = base.campagnes.find((c) => c.id === "m1")!;
    const n = compteursCampagne(premiere);
    const ligne = document.querySelector('a[href="/demo/messages/m1"]')!;
    expect(ligne.textContent).toContain(`${n.acceptes} acceptés`);
    expect(ligne.textContent).toContain(`${n.distribues} distribués`);
    expect(n.acceptes).toBeGreaterThan(n.distribues);
  });

  it("montre le libellé du groupe, l’auteur et l’heure", () => {
    monter(<DemoMessages />);
    const ligne = document.querySelector('a[href="/demo/messages/m1"]')!;
    expect(ligne.textContent).toContain("Tous les adhérents");
    expect(ligne.textContent).toContain("Hélène Vasseur");
    expect(ligne.textContent).toContain("14 octobre à 18 h 12");
  });

  it("conserve la mention sur ce qui n’est pas mesuré", () => {
    monter(<DemoMessages />);
    expect(screen.getByText(/Klubster ne mesure ni les ouvertures ni les clics/)).toBeTruthy();
  });

  it("ne promet ni ouverture, ni clic, ni planification, ni pièce jointe", () => {
    monter(<DemoMessages />);
    // La mention légitime parle d'ouvertures : on cherche donc dans les seuls libellés
    // d'action, pas dans le texte de la page.
    const gestes = Array.from(document.querySelectorAll("button, a, label")).map((e) => e.textContent ?? "");
    for (const interdit of [/ouvertur/i, /taux de clic/i, /planifier/i, /pièce jointe/i, /brouillon/i, /modèle/i]) {
      expect(gestes.some((t) => interdit.test(t))).toBe(false);
    }
    // Et aucun champ de date ou de fichier : rien ne se programme, rien ne s'attache.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
  });

  it("ne garde que les 25 dernières", () => {
    // Le club en a trois : on en fabrique quarante pour éprouver la coupe.
    const base = creerEtatDemoInitial();
    const modele = base.campagnes[0];
    const beaucoup: EtatDemo = {
      ...base,
      campagnes: Array.from({ length: 40 }, (_, i) => ({
        ...modele,
        id: `mx${i}`,
        objet: `Message ${i}`,
        created_at: `2026-10-0${(i % 9) + 1}T10:00:00+02:00`,
      })),
    };
    // On passe par le sélecteur d'affichage, pas par l'écran : la coupe est un calcul.
    const affichees = [...beaucoup.campagnes]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 25);
    expect(affichees.length).toBe(25);
    expect(new Date(affichees[0].created_at) >= new Date(affichees[24].created_at)).toBe(true);
  });
});

// ——— Le détail ————————————————————————————————————————————————————————————————

describe("le détail d’une campagne", () => {
  const detail = (id: string) =>
    monter(
      <Suspense fallback={null}>
        <DemoCampagne params={paramsResolus(id)} />
      </Suspense>
    );

  it("montre cinq cases, sans les retardés", () => {
    const base = creerEtatDemoInitial();
    detail("m1");
    const n = compteursCampagne(base.campagnes.find((c) => c.id === "m1")!);

    for (const label of ["DESTINATAIRES", "ACCEPTÉS", "DISTRIBUÉS", "ÉCHECS", "SIGNALÉS"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // « RETARDÉS » n'a pas de case : le produit n'en met pas.
    expect(screen.queryByText("RETARDÉS")).toBeNull();
    expect(n.plaintes).toBeGreaterThan(0);
  });

  it("affiche le corps du message et l’état de chaque adresse", () => {
    const base = creerEtatDemoInitial();
    detail("m3");
    const campagne = base.campagnes.find((c) => c.id === "m3")!;
    // `getByText` normalise les blancs : on cherche une phrase du corps sans retour à
    // la ligne, plutôt que ses trente premiers caractères qui en contiennent deux.
    expect(campagne.corps).toContain("Sauf erreur de notre part");
    expect(screen.getByText(/Sauf erreur de notre part/)).toBeTruthy();
    // Une ligne retardée existe dans cette campagne, et porte son libellé.
    expect(campagne.destinataires.some((d) => d.statut === "retarde")).toBe(true);
    expect(screen.getByText("Retardé")).toBeTruthy();
    expect(screen.getByText(`1–${campagne.destinataires.length} sur ${campagne.destinataires.length}`)).toBeTruthy();
  });

  it("trie par statut puis par identifiant", () => {
    detail("m1");
    const lignes = Array.from(document.querySelectorAll(".border-b.border-line.px-4.py-2\\.5"));
    const statuts = lignes.map((l) => (l.textContent ?? "").trim());
    // « Distribué » (distribue) vient avant « Signalé » (plainte) et « Rejeté » (rejete).
    const iDistribue = statuts.findIndex((s) => s.includes("Distribué"));
    const iPlainte = statuts.findIndex((s) => s.includes("Signalé comme indésirable"));
    const iRejete = statuts.findIndex((s) => s.includes("Rejeté"));
    expect(iDistribue).toBeLessThan(iPlainte);
    expect(iPlainte).toBeLessThan(iRejete);
  });

  it("ne laisse pas un identifiant inconnu casser l’écran", () => {
    detail("m-inexistante");
    expect(screen.getByText(/n’existe pas dans la simulation/)).toBeTruthy();
    // Et la sortie reste offerte.
    expect(within(document.body).getByText("← MESSAGERIE")).toBeTruthy();
  });
});
