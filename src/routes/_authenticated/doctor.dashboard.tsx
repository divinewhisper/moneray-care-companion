import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, LogOut, MessageCircle, Pencil, ShieldCheck, XCircle } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUploader } from "@/components/moneray/Avatar";
import { getMyDoctorProfile, updateDoctorName } from "@/lib/doctor.functions";

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
  const saveName = useServerFn(updateDoctorName);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: () => fetchProfile(),
  });

  const { data: myProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
  }, [profile]);

  async function save() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("กรุณากรอกชื่อและนามสกุล");
      return;
    }
    setSaving(true);
    try {
      await saveName({ data: { firstName: firstName.trim(), lastName: lastName.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      toast.success("เปลี่ยนชื่อเรียบร้อย");
      setEditing(false);
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

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
            <AvatarUploader path={myProfile?.avatar_url} />
            <div className="rounded-2xl bg-secondary p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg text-muted-foreground">แพทย์</p>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="rounded-xl bg-white p-3"
                  aria-label="แก้ไขชื่อ"
                >
                  <Pencil className="size-6" />
                </button>
              </div>
              {editing ? (
                <div className="mt-3 space-y-3">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ชื่อ"
                    className="w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="นามสกุล"
                    className="w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
                  />
                  <button
                    onClick={save}
                    disabled={saving}
                    className="w-full rounded-2xl bg-[var(--zone)] px-4 py-4 text-xl font-bold text-[var(--zone-foreground)] disabled:opacity-60"
                  >
                    {saving ? "กำลังบันทึก…" : "บันทึกชื่อใหม่"}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    นพ. {profile.first_name} {profile.last_name}
                  </p>
                  <p className="mt-1 text-xl">{profile.specialty}</p>
                  <p className="text-xl text-muted-foreground">{profile.hospital}</p>
                </>
              )}
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
              <>
                <Link
                  to="/doctor/patients"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] px-4 py-5 text-2xl font-bold text-[var(--zone-foreground)]"
                >
                  <MessageCircle className="size-7" /> คำถามจากผู้ป่วย
                </Link>
                <div className="rounded-2xl bg-secondary p-5 text-xl">
                  การสนทนาที่ผู้ป่วยส่งถึงแพทย์จะแสดงในกล่องคำถามด้านบน
                </div>
              </>
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
