"use client";

import { createContext, useContext, useState } from "react";

/**
 * La date de naissance vit dans le bloc IDENTITÉ (demande de Mathieu, 15/07/2026 :
 * « les premières choses à demander sont l'identité, l'adresse, mail, téléphone »)
 * mais elle pilote aussi le questionnaire de santé et le bloc responsable légal,
 * plus bas dans le formulaire. Ce contexte partage la valeur entre les deux îlots
 * client sans remonter toute la page en client component.
 */
const NaissanceContext = createContext<{ naissance: string; setNaissance: (v: string) => void }>({
  naissance: "",
  setNaissance: () => {},
});

export function NaissanceProvider({ children }: { children: React.ReactNode }) {
  const [naissance, setNaissance] = useState("");
  return <NaissanceContext.Provider value={{ naissance, setNaissance }}>{children}</NaissanceContext.Provider>;
}

export function useNaissance() {
  return useContext(NaissanceContext);
}

/** Champ « Date de naissance » du bloc Identité — même habillage que Field. */
export function ChampNaissance() {
  const { naissance, setNaissance } = useNaissance();
  return (
    <div className="bg-paper px-5 py-4">
      <label htmlFor="naissance" className="mono text-[10px] uppercase tracking-label text-ink-soft">
        DATE DE NAISSANCE *
      </label>
      <input
        id="naissance"
        type="date"
        name="naissance"
        required
        value={naissance}
        onChange={(e) => setNaissance(e.target.value)}
        autoComplete="bday"
        className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
      />
    </div>
  );
}
