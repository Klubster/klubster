// Messagerie « Écrire à Mathieu » — types partagés (président ↔ éditeur).
// La sécurité réelle est portée par la base (RLS, migration 0020) ; ces types ne servent
// qu'au transport entre Server Actions et composants.

export type ChatSender = "club" | "operateur";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: ChatSender;
  corps: string;
  created_at: string;
}

// Côté opérateur (/admin/messages) : une conversation enrichie du nom du club.
export interface ConversationOp {
  id: string;
  organisation_id: string;
  club_nom: string;
  club_slug: string;
  statut: string;
  dernier_message_at: string | null;
  dernier_sender: string | null;
  dernier_apercu: string | null;
  non_lus_operateur: number;
}
