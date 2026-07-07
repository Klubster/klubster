import type { Metadata } from "next";
import CombatClient from "./CombatClient";

export const metadata: Metadata = {
  title: "Klubster Combat — Le logiciel qui gère ton club de combat",
  description:
    "Le logiciel qui gère ton club de combat : inscriptions, licences, certificats, paiements et communication. Boxe, kickboxing, full contact, MMA, karaté. Créé par un président de club.",
};

export default function CombatPage() {
  return <CombatClient />;
}
