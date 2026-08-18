import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileText, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import {
  amIAdmin,
  getLicenseUrl,
  listDoctorProfiles,
  setDoctorStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "อนุมัติแพทย์ — Moneray" },
      { name: "description", content: "หน้าผู้ดูแลระบบ Moneray สำหรับตรวจสอบและอนุมัติการลงทะเบียนแพทย์" },
      { property: "og:title", content: "อนุมัติแพทย์ — Moneray" },
      { property: "og:description", content: "ตรวจสอบใบประกอบวิชาชีพและอนุมัติแพทย์ในระบบ Moneray" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const statusLabel: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่ผ่าน",
};

function AdminPage() {
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const fetchList = useServerFn(listDoctorProfiles);
  const updateStatus = useServerFn(setDoctorStatus);
  const licenseUrl = useServerFn(getLicenseUrl);

  const { data: admin, isLoading: adminLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
  });

  const isAdmin = admin?.isAdmin === true;

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: () => fetchList(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; status: "approved" | "rejected" | "pending" }) =>
      updateStatus({ data: vars }),
    onSuccess: async () => {
      toast.success("บันทึกสถานะแล้ว");
      await queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function openLicense(path: string) {
    try {
      const { url } = await licenseUrl({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <PhoneShell className="zone-body-diagnose">
      <ZoneHeader title="อนุมัติแพทย์" subtitle="สำหรับผู้ดูแลระบบ" backTo="/home" />
      <div className="space-y-5 px-5 pt-6">
        {adminLoading ? (
          <p className="text-xl">กำลังตรวจสอบสิทธิ์…</p>
        ) : !isAdmin ? (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-input p-5">
            <ShieldAlert className="mt-1 size-8 shrink-0" />
            <p className="text-xl">
              บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ
            </p>
          </div>
        ) : isLoading ? (
          <p className="text-xl">กำลังโหลดรายชื่อแพทย์…</p>
        ) : !doctors || doctors.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-5 text-xl">ยังไม่มีแพทย์ลงทะเบียน</p>
        ) : (
          doctors.map((doc) => (
            <div key={doc.id} className="space-y-3 rounded-2xl border-2 border-input p-5">
              <div>
                <p className="text-2xl font-bold">
                  นพ. {doc.first_name} {doc.last_name}
                </p>
                <p className="text-xl">{doc.specialty}</p>
                <p className="text-xl text-muted-foreground">{doc.hospital}</p>
                <p className="mt-1 text-lg text-muted-foreground">{doc.email}</p>
                <p className="text-lg text-muted-foreground">โทร {doc.phone}</p>
              </div>

              <div className="rounded-xl bg-secondary p-4">
                <p className="text-lg text-muted-foreground">เลขที่ใบประกอบวิชาชีพ</p>
                <p className="text-xl font-bold">{doc.license_number}</p>
                <p className="mt-2 text-lg">
                  สถานะปัจจุบัน:{" "}
                  <span className="font-bold">{statusLabel[doc.status] ?? doc.status}</span>
                </p>
              </div>

              {doc.license_file_path ? (
                <button
                  onClick={() => openLicense(doc.license_file_path)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-input px-4 py-4 text-xl font-bold"
                >
                  <FileText className="size-6" /> ดูไฟล์ใบประกอบวิชาชีพ
                </button>
              ) : null}

              <div className="flex gap-3">
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ userId: doc.user_id, status: "approved" })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] px-3 py-4 text-xl font-bold text-[var(--zone-foreground)] disabled:opacity-60"
                >
                  <CheckCircle2 className="size-6" /> อนุมัติ
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ userId: doc.user_id, status: "rejected" })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-input px-3 py-4 text-xl font-bold disabled:opacity-60"
                >
                  <XCircle className="size-6" /> ไม่ผ่าน
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </PhoneShell>
  );
}
