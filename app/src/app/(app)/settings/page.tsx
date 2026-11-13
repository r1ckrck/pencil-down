import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <PageHeader eyebrow="Settings" index="05" title="Settings" />;
}
