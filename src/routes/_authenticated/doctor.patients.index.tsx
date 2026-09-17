import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { listPatientThreads } from "@/lib/doctor.functions";

export const Route = createFileRoute("/_authenticated/doctor/patients/")({
  component: DoctorInbox,
});

function DoctorInbox() {
  const fetchThreads = useServerFn(listPatientThreads);
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctor-threads"],
    queryFn: () => fetchThreads(),
    refetchInterval: 15000,
  });

  return (
    <PhoneShell className="zone-body-diagnose">
      <ZoneHeader
        title="คำถามจากผู้ป่วย"
        subtitle="การสนทนาที่ส่งถึงแพทย์ทั้งหมด"
        backTo="/doctor/dashboard"
      />
      <div className="space-y-4 px-5 pt-6">
        {isLoading ? (
          <p className="text-xl">กำลังโหลด…</p>
        ) : error ? (
          <div className="rounded-2xl bg-secondary p-5 text-xl">
            {error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ"}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl bg-secondary p-5 text-xl">
            ยังไม่มีคำถามจากผู้ป่วยในขณะนี้
          </div>
        ) : (
          data.map((t) => (
            <Link
              key={t.id}
              to="/doctor/patients/$threadId"
              params={{ threadId: t.id }}
              className="block rounded-2xl border-2 border-input p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl font-bold">{t.patientName}</p>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {t.mine ? (
                    <span className="rounded-xl bg-secondary px-3 py-1 text-lg font-bold">
                      ผู้ป่วยของฉัน
                    </span>
                  ) : null}
                  {t.awaitingReply ? (
                    <span className="rounded-xl bg-[var(--zone)] px-3 py-1 text-lg font-bold text-[var(--zone-foreground)]">
                      รอตอบ
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-1 text-lg text-muted-foreground">
                {t.category === "mental" ? "สุขภาพจิต" : "สุขภาพกาย"} ·{" "}
                {t.mode === "diagnose" ? "วินิจฉัยโรค" : "ติดตามอาการ"}
              </p>
              <p className="mt-2 line-clamp-2 text-xl">{t.lastQuestion || t.title}</p>
              <p className="mt-2 flex items-center gap-2 text-lg text-muted-foreground">
                <MessageCircle className="size-5" /> {t.questionCount} คำถาม ·{" "}
                {new Date(t.updatedAt).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </Link>
          ))
        )}
      </div>
    </PhoneShell>
  );
}
