import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Part B" };

export default function PartBPage() {
  return <PageHeader eyebrow="Part B" index="02" title="Part B" />;
}
