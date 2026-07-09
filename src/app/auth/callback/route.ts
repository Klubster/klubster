import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Retour de confirmation d'email (flux par défaut Supabase : ?code=...).
// Pas besoin de modifier le modèle d'email : on fixe redirect_to via emailRedirectTo côté code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextExplicite = searchParams.get("next");
  let dest = nextExplicite ?? "/creer";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Une destination explicite (ex. réinitialisation de mot de passe) prime sur
      // la redirection automatique vers le cockpit.
      if (nextExplicite && nextExplicite.startsWith("/") && !nextExplicite.startsWith("//")) {
        return NextResponse.redirect(new URL(nextExplicite, origin));
      }
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("role, organisation_id").eq("id", user.id).maybeSingle();
        if (prof?.role === "admin_asso") {
          if (prof.organisation_id) {
            const { data: org } = await supabase.from("organisations").select("slug").eq("id", prof.organisation_id).maybeSingle();
            dest = org?.slug ? `/${org.slug}/cockpit` : "/creer";
          } else dest = "/creer";
        } else {
          const { data: adh } = await supabase.from("adherents").select("organisation_id").eq("user_id", user.id).limit(1).maybeSingle();
          if (adh?.organisation_id) {
            const { data: org } = await supabase.from("organisations").select("slug").eq("id", adh.organisation_id).maybeSingle();
            if (org?.slug) dest = `/${org.slug}/espace`;
          }
        }
      }
      return NextResponse.redirect(new URL(dest, origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?erreur=confirmation", origin));
}
