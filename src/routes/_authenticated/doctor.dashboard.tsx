import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, LogOut, ShieldCheck, XCircle } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { getMyDoctorProfile } from "@/lib/doctor.functions";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  component: DoctorDashboard,
});

const statusInfo: Record<string, { label: string; detail: string }> = {
  pending: {
    label: "รอตรวจสอบใบประกอบวิชาชีพ",
    detail: "ทีมงานกำลังตรวจสอบเอกสารของคุณ โดยปกติใช้เวลา 1–3 วันทำการ",
  },
  approved: {
    label: "อนุมัติแล้ว",
    detail: "คุณสามารถรับปรึกษาผู้ป่วยผ่านแชตและวิดีโอคอลได้",
  },
  rejected: {
    label: "ไม่ผ่านการตรวจสอบ",
    detail: "กรุณาตรวจสอบข้อมูลและแนบเอกสารใหม่อีกครั้ง",
  },
};

function DoctorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyDoctorProfile);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: () => fetchProfile(),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/doctor", replace: true });
  }

  const status = profile?.status ?? "pending";
  const info = statusInfo[status] ?? statusInfo["pending"]!;

  return (
    <PhoneShell className="zone-body-diagnose">
      <ZoneHeader title="แดชบอร์ดแพทย์" subtitle="สถานะบัญชีและงานของคุณ" backTo="/doctor" />
      <div className="space-y-5 px-5 pt-6">
        {isLoading ? (
          <p className="text-xl">กำลังโหลดข้อมูล…</p>
        ) : !profile ? (
          <div className="rounded-2xl bg-secondary p-5">
            <p className="text-xl">คุณยังไม่ได้ลงทะเบียนเป็นแพทย์</p>
            <Link
              to="/doctor/register"
              className="mt-4 block rounded-2xl bg-[var(--zone)] px-4 py-5 text-center text-2xl font-bold text-[var(--zone-foreground)]"
            >
              ลงทะเบียนและแนบใบประกอบวิชาชีพ
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-secondary p-5">
              <p className="text-lg text-muted-foreground">แพทย์</p>
              <p className="text-3xl font-bold">
                นพ. {profile.first_name} {profile.last_name}
              </p>
              <p className="mt-1 text-xl">{profile.specialty}</p>
              <p className="text-xl text-muted-foreground">{profile.hospital}</p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border-2 border-input p-5">
              {status === "approved" ? (
                <ShieldCheck className="mt-1 size-8 shrink-0" />
              ) : status === "rejected" ? (
                <XCircle className="mt-1 size-8 shrink-0" />
              ) : (
                <Clock className="mt-1 size-8 shrink-0" />
              )}
              <div>
                <p className="text-2xl font-bold">{info.label}</p>
                <p className="mt-1 text-xl text-muted-foreground">{info.detail}</p>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-input p-5">
              <p className="text-lg text-muted-foreground">เลขที่ใบประกอบวิชาชีพ</p>
              <p className="text-2xl font-bold">{profile.license_number}</p>
            </div>

            {status === "approved" ? (
              <div className="rounded-2xl bg-secondary p-5 text-xl">
                ยังไม่มีคำขอปรึกษาใหม่ในขณะนี้ ระบบจะแจ้งเตือนเมื่อมีผู้ป่วยเริ่มการสนทนา
              </div>
            ) : (
              <Link
                to="/doctor/register"
                className="block rounded-2xl border-2 border-input px-4 py-5 text-center text-xl font-bold"
              >
                แก้ไขข้อมูล / แนบเอกสารใหม่
              </Link>
            )}
          </>
        )}

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-input px-4 py-5 text-xl font-bold"
        >
          <LogOut className="size-6" /> ออกจากระบบ
        </button>
      </div>
    </PhoneShell>
  );
}
