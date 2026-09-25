import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/** แสดงรูปโปรไฟล์จากที่เก็บไฟล์ (path) */
export function Avatar({ path, size = 64, className = "" }: { path?: string | null | undefined; size?: number | undefined; className?: string | undefined }) {
  const { data: url } = useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground ${className}`}
    >
      {url ? (
        <img src={url} alt="รูปโปรไฟล์" className="h-full w-full object-cover" />
      ) : (
        <UserRound style={{ width: size * 0.6, height: size * 0.6 }} />
      )}
    </div>
  );
}

/** รูปโปรไฟล์ของผู้ใช้ที่ล็อกอิน พร้อมปุ่มเปลี่ยนรูป */
export function AvatarUploader({ path, size = 112 }: { path?: string | null | undefined; size?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("กรุณาเลือกไฟล์รูปภาพ");
    if (file.size > 5 * 1024 * 1024) return toast.error("รูปต้องมีขนาดไม่เกิน 5MB");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return undefined;
      const ext = file.name.split(".").pop() || "jpg";
      const newPath = `${u.user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(newPath, file, { upsert: true });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("profiles")
        .upsert({ id: u.user.id, email: u.user.email ?? "", avatar_url: newPath }, { onConflict: "id" });
      if (e2) throw e2;
      if (path) void supabase.storage.from("avatars").remove([path]);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      toast.success("เปลี่ยนรูปโปรไฟล์เรียบร้อย");
    } catch {
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar path={path} size={size} className="border-4 border-primary" />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl border-2 border-input px-4 py-2 text-lg font-semibold disabled:opacity-60"
      >
        <Camera className="size-5" /> {busy ? "กำลังอัปโหลด…" : "เปลี่ยนรูปโปรไฟล์"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
