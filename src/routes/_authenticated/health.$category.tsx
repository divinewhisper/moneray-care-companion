import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Stethoscope, HeartPulse } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { categoryLabel, isCategory } from "@/lib/moneray";

export const Route = createFileRoute("/_authenticated/health/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  if (!isCategory(category)) throw notFound();

  const zone = category === "body" ? "zone-body-diagnose" : "zone-mind-diagnose";

  return (
    <PhoneShell className={zone}>
      <ZoneHeader
        title={categoryLabel[category]}
        subtitle="เลือกบริการที่ต้องการ"
        backTo="/home"
      />
      <div className="space-y-5 px-5 pt-7">
        <Link
          to="/health/$category/$mode"
          params={{ category, mode: "diagnose" }}
          className={`flex flex-col items-center gap-4 rounded-2xl py-12 ${
            category === "body"
              ? "zone-body-diagnose bg-[var(--zone)] text-[var(--zone-foreground)]"
              : "zone-mind-diagnose bg-[var(--zone)] text-[var(--zone-foreground)]"
          }`}
        >
          <Stethoscope className="size-20" strokeWidth={2.5} />
          <span className="text-3xl font-bold">วินิจฉัยโรค</span>
        </Link>
        <Link
          to="/health/$category/$mode"
          params={{ category, mode: "followup" }}
          className={`flex flex-col items-center gap-4 rounded-2xl py-12 ${
            category === "body"
              ? "zone-body-followup bg-[var(--zone)] text-[var(--zone-foreground)]"
              : "zone-mind-followup bg-[var(--zone)] text-[var(--zone-foreground)]"
          }`}
        >
          <HeartPulse className="size-20" strokeWidth={2.5} />
          <span className="text-center text-3xl font-bold">ติดตามอาการ
            <br />หลังการรักษา</span>
        </Link>
      </div>
    </PhoneShell>
  );
}
