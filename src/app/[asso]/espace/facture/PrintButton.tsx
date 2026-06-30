"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mono border border-ink px-5 py-2.5 text-[12px] hover:bg-ink hover:text-paper print:hidden">
      IMPRIMER / PDF →
    </button>
  );
}
