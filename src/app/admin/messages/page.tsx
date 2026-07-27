import Link from "next/link";
import { exigerSuperAdmin } from "@/lib/admin";
import { listerConversations } from "./actions";
import ChatOperateur from "./ChatOperateur";
import PushSetup from "@/components/site/PushSetup";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function MessagesAdmin() {
  await exigerSuperAdmin("/admin/messages");
  const convs = await listerConversations();
  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
        <Link href="/admin" className="mono text-[12px] text-ink-soft hover:text-ink">← CONSOLE</Link>
        <div className="flex items-center gap-4">
          <PushSetup />
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGES DES CLUBS<Cur /></span>
        </div>
      </header>
      <div className="p-4 md:p-6">
        <ChatOperateur initial={convs} />
      </div>
    </main>
  );
}
