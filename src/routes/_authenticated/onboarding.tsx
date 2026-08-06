import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      onboarded: true,
    });
    setBusy(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }
    toast.success("บันทึกข้อมูลเรียบร้อย");
    navigate({ to: "/home", replace: true });
  }

  return (
    <PhoneShell>
      <div className="flex items-center justify-between bg-topbar px-5 py-6 text-topbar-foreground">
        <h1 className="text-3xl font-bold">ตั้งค่าบัญชีของคุณ</h1>
        <Logo className="h-12 w-12 bg-white" />
      </div>
      <form onSubmit={save} className="space-y-4 px-5 pt-6">
        <p className="text-xl text-muted-foreground">
          กรอกข้อมูลเพื่อให้แพทย์ติดต่อและจัดส่งยาถึงคุณได้
        </p>
        <Field label="ชื่อ" value={firstName} onChange={setFirstName} required />
        <Field label="นามสกุล" value={lastName} onChange={setLastName} required />
        <Field
          label="เบอร์โทรศัพท์"
          value={phone}
          onChange={setPhone}
          required
          type="tel"
          placeholder="08X-XXX-XXXX"
        />
        <label className="block">
          <span className="text-xl font-semibold">ที่อยู่สำหรับจัดส่งพัสดุ</span>
          <textarea
            required
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-input bg-background px-4 py-4 text-xl"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-topbar px-4 py-5 text-2xl font-bold text-topbar-foreground disabled:opacity-60"
        >
          บันทึกและเริ่มใช้งาน
        </button>
      </form>
    </PhoneShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xl font-semibold">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border-2 border-input bg-background px-4 py-4 text-xl"
      />
    </label>
  );
}
