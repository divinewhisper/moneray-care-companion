import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { registerDoctor } from "@/lib/doctor.functions";

export const Route = createFileRoute("/_authenticated/doctor/register")({
  component: DoctorRegisterPage,
});

function DoctorRegisterPage() {
  const navigate = useNavigate();
  const submitRegistration = useServerFn(registerDoctor);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("กรุณาแนบไฟล์ใบประกอบวิชาชีพ");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");

      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${user.id}/license-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("doctor-licenses")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      await submitRegistration({
        data: { firstName, lastName, phone, licenseNumber, specialty, hospital, licenseFilePath: path },
      });
      toast.success("ส่งข้อมูลเรียบร้อย รอการตรวจสอบใบประกอบวิชาชีพ");
      navigate({ to: "/doctor/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneShell className="zone-body-diagnose">
      <ZoneHeader
        title="ลงทะเบียนแพทย์"
        subtitle="กรอกข้อมูลวิชาชีพและแนบใบประกอบวิชาชีพเวชกรรม"
        backTo="/doctor"
      />
      <form onSubmit={submit} className="space-y-4 px-5 pt-6">
        <Field label="ชื่อ" value={firstName} onChange={setFirstName} />
        <Field label="นามสกุล" value={lastName} onChange={setLastName} />
        <Field label="เบอร์โทรศัพท์" value={phone} onChange={setPhone} type="tel" />
        <Field
          label="เลขที่ใบประกอบวิชาชีพเวชกรรม"
          value={licenseNumber}
          onChange={setLicenseNumber}
        />
        <Field label="สาขาเฉพาะทาง" value={specialty} onChange={setSpecialty} />
        <Field label="โรงพยาบาล / คลินิก" value={hospital} onChange={setHospital} />

        <label className="block rounded-2xl border-2 border-dashed border-input p-5">
          <span className="flex items-center gap-2 text-xl font-semibold">
            <FileUp className="size-7" /> ไฟล์ใบประกอบวิชาชีพ (PDF หรือรูปภาพ)
          </span>
          <input
            type="file"
            required
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-3 w-full text-lg"
          />
          {file ? <p className="mt-2 text-lg text-muted-foreground">{file.name}</p> : null}
        </label>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] px-4 py-5 text-2xl font-bold text-[var(--zone-foreground)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : null}
          ส่งข้อมูลเพื่อตรวจสอบ
        </button>
      </form>
    </PhoneShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xl font-semibold">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border-2 border-input bg-background px-4 py-4 text-xl"
      />
    </label>
  );
}
