import { EcranChargement } from "@/components/ui/Squelette";

// Lot S — même raison que le cockpit : aucune navigation sans signal.
export default function ChargementEspace() {
  return <EcranChargement libelle="Chargement de votre espace…" />;
}
