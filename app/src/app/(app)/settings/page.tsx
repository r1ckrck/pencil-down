import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Settings" index="05" title="Settings" />
      <SettingsForm examDate="Sun 17 Jan 2027" />
    </>
  );
}
