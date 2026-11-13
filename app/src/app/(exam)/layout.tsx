import { ExamShell } from "@/components/shell/exam-shell";

/** Live session routes go in this group: no nav, no sign-off. */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return <ExamShell>{children}</ExamShell>;
}
