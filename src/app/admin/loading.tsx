import { EcranChargement } from "@/components/ui/Squelette";

// Lot S — la console agrège tous les clubs : ses requêtes sont les plus longues du
// produit, c'est l'endroit où le signal de chargement manquait le plus.
export default function ChargementAdmin() {
  return <EcranChargement libelle="Chargement de la console…" />;
}
