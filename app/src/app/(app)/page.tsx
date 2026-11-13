import { PageHeader } from "@/components/shell/page-header";
import { SignOff } from "@/components/shell/sign-off";

export default function TodayPage() {
  return (
    <>
      <PageHeader eyebrow="Today" index="00" title="Today" />
      <SignOff reference="today" />
    </>
  );
}
