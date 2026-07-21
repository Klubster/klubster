import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Confirmation d'email (@supabase/ssr) + redirection selon le rôle.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let dest = searchParams.get("next") ?? "/creer";

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("role, organisation_id").eq("id", user.id).maybeSingle();
        if (prof?.role === "super_admin") {
          dest = "/admin";
        } else if (prof?.role === "admin_asso") {
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
