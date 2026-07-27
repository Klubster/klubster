// Types partagés du chat public du site vitrine (visiteur ↔ Mathieu).
// La sécurité réelle est portée par le service-role côté server actions / route API.
export interface SiteChatMessage {
  id: string;
  sender: "visiteur" | "operateur";
  corps: string;
  cree_at: string;
}
