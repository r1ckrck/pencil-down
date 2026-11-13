import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return <PageHeader eyebrow="Knowledge" index="03" title="Knowledge" />;
}
