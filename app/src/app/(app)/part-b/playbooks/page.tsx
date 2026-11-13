import type { Metadata } from "next";
import { PlaybookCard } from "@/components/part-b/playbook-card";
import { PageHeader } from "@/components/shell/page-header";
import { getContent } from "@/content/load";

export const metadata: Metadata = { title: "Playbooks · Part B" };

export default function PlaybooksPage() {
  const books = getContent().playbooks;
  return (
    <>
      <PageHeader eyebrow="Part B" index="02" title="Playbooks">
        One per slot. Each names the single decision to make, when to make it, and the ways it usually goes wrong.
      </PageHeader>
      <div className="flex flex-col gap-8">
        {books.map((b, i) => (
          <PlaybookCard key={b.slot} book={b} index={String(i + 1).padStart(2, "0")} />
        ))}
      </div>
    </>
  );
}
