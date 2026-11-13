import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return <PageHeader eyebrow="Progress" index="04" title="Progress" />;
}
