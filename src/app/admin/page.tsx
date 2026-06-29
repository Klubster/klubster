import { Container } from "@/components/ui/Layout";

export const dynamic = "force-dynamic";

export default function SuperAdmin() {
  return (
    <main className="min-h-screen bg-bg-alt">
      <header className="border-b border-line bg-surface">
        <Container className="flex items-center justify-between py-3">
          <span className="font-mono text-sm font-bold lowercase">klubster · super-admin</span>
        </Container>
      </header>
      <Container className="py-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">plateforme</p>
        <h1 className="mt-2 text-3xl font-bold">Toutes les associations</h1>
        <p className="mt-2 text-ink-soft">
          Liste des assos, statut, activité, facturation et commission. Accès réservé au super-admin
          (authentification : jalon suivant).
        </p>
        <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-alt text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Association</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-3 font-medium">USM Boxe Anglaise</td>
                <td className="px-5 py-3 text-ink-soft">Club</td>
                <td className="px-5 py-3 text-ink-soft">Publié</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Container>
    </main>
  );
}
