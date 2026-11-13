import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <>
      <PageHeader eyebrow="Progress" index="04" title="Progress" />
      <ProgressView />
    </>
  );
}
