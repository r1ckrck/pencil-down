import type { Metadata } from "next";
import Link from "next/link";
import { ReviewSession } from "@/components/knowledge/review-session";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Review · Knowledge" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Knowledge · review"
        index="03"
        title="Review"
        aside={
          <Link href="/knowledge" className="inline-flex min-h-touch items-center hover:text-fg">
            Done for now
          </Link>
        }
      />
      <ReviewSession />
    </>
  );
}
