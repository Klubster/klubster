import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import CreerWizard from "./CreerWizard";

export const dynamic = "force-dynamic";

export default async function CreerPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/creer");
  return <CreerWizard />;
}
