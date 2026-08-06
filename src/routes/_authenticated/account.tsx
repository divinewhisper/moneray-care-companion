import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, LogOut } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

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

  async function save() {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      })
      .eq("id", profile.id);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("บันทึกข้อมูลเรียบร้อย");
  }

  async function toggle(field: "show_name" | "show_contact") {
    if (!profile) return;
    const patch =
      field === "show_name"
        ? { show_name: !profile.show_name }
        : { show_contact: !profile.show_contact };
    await supabase.from("profiles").update(patch).eq("id", profile.id);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const contactHidden = profile?.show_contact === false;

  return (
    <PhoneShell className="zone-body-followup">
      <ZoneHeader title="ข้อมูลบัญชี" subtitle="ดูและแก้ไขข้อมูลติดต่อของคุณ" backTo="/home" />
      <div className="space-y-5 px-5 pt-6">
        <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
          <span className="text-xl font-semibold">แสดงชื่อบนหน้าแรก</span>
          <button onClick={() => toggle("show_name")} className="rounded-xl bg-white p-3">
            {profile?.show_name === false ? <EyeOff className="size-7" /> : <Eye className="size-7" />}
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
          <span className="text-xl font-semibold">แสดงข้อมูลติดต่อ</span>
          <button onClick={() => toggle("show_contact")} className="rounded-xl bg-white p-3">
            {contactHidden ? <EyeOff className="size-7" /> : <Eye className="size-7" />}
          </button>
        </div>

        <div className="rounded-2xl border-2 border-input p-5">
          <p className="text-lg text-muted-foreground">อีเมล</p>
          <p className="text-xl font-bold">{contactHidden ? "••••••••" : profile?.email}</p>
        </div>

        <label className="block">
          <span className="text-xl font-semibold">ชื่อ</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
          />
        </label>
        <label className="block">
          <span className="text-xl font-semibold">นามสกุล</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
          />
        </label>
        <label className="block">
          <span className="text-xl font-semibold">เบอร์โทรศัพท์</span>
          <input
            value={contactHidden ? "" : phone}
            placeholder={contactHidden ? "••••••••" : ""}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
          />
        </label>
        <label className="block">
          <span className="text-xl font-semibold">ที่อยู่จัดส่งพัสดุ</span>
          <textarea
            rows={4}
            value={contactHidden ? "" : address}
            placeholder={contactHidden ? "••••••••" : ""}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
          />
        </label>

        <button
          onClick={save}
          className="w-full rounded-2xl bg-[var(--zone)] px-4 py-5 text-2xl font-bold text-[var(--zone-foreground)]"
        >
          บันทึกข้อมูล
        </button>
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
