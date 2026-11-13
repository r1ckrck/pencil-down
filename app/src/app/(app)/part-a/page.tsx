import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Part A" };

export default function PartAPage() {
  return <PageHeader eyebrow="Part A" index="01" title="Part A" />;
}
