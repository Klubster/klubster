import { EcranChargement } from "@/components/ui/Squelette";

// Lot S. Pendant une navigation serveur, l'écran précédent restait affiché sans signal :
// le bénévole recliquait, croyant son geste perdu. Le squelette dit « ça arrive ».
export default function ChargementCockpit() {
  return <EcranChargement libelle="Chargement du cockpit…" />;
}
