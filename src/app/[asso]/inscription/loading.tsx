import { EcranChargement } from "@/components/ui/Squelette";

// Lot S — l'inscription publique est le premier contact d'une famille avec le club :
// un blanc sans signal au premier clic est le pire moment pour en avoir un.
export default function ChargementInscription() {
  return <EcranChargement libelle="Chargement de l’inscription…" />;
}
