import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/moneray/Avatar";
import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { getPatientThread, markPatientThreadRead, replyToPatient } from "@/lib/doctor.functions";

export const Route = createFileRoute("/_authenticated/doctor/patients/$threadId")({
  component: DoctorThread,
});

function DoctorThread() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchThread = useServerFn(getPatientThread);
  const sendReply = useServerFn(replyToPatient);
  const markRead = useServerFn(markPatientThreadRead);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["doctor-thread", threadId],
    queryFn: () => fetchThread({ data: { threadId } }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  // เปิดอ่านแล้ว = ล้างสัญลักษณ์ข้อความใหม่
  useEffect(() => {
    if (!data?.messages.length) return;
    void markRead({ data: { threadId } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["doctor-threads"] }))
      .catch(() => undefined);
  }, [data?.messages.length, markRead, queryClient, threadId]);


  const mutation = useMutation({
    mutationFn: (content: string) => sendReply({ data: { threadId, content } }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["doctor-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-threads"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ"),
  });

  return (
    <PhoneShell className="zone-body-diagnose" fullHeight>
      <div className="flex h-full flex-col">
        <ZoneHeader
          title={data?.patientName ?? "การสนทนา"}
          subtitle={data?.patientPhone || "ผู้ป่วย"}
          backTo="/doctor/patients"
        />

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <p className="text-xl">กำลังโหลด…</p>
          ) : error ? (
            <div className="rounded-2xl bg-secondary p-5 text-xl">
              {error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ"}
            </div>
          ) : (
            (data?.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${m.role === "user" ? "" : "flex-row-reverse"}`}
              >
                <Avatar
                  path={m.role === "user" ? data?.patientAvatarPath : data?.doctorAvatarPath}
                  size={40}
                />
                <div className={`max-w-[85%] ${m.role === "user" ? "" : "text-right"}`}>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-xl ${
                      m.role === "user"
                        ? "bg-secondary"
                        : "bg-[var(--zone)] text-[var(--zone-foreground)]"
                    }`}
                  >
                    {m.content}
                  </div>
                  <p className="mt-1 px-1 text-sm text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) mutation.mutate(text.trim());
          }}
          className="flex items-end gap-2 border-t-2 border-input bg-background px-4 py-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="พิมพ์คำตอบถึงผู้ป่วย…"
            className="flex-1 resize-none rounded-2xl border-2 border-input bg-background px-4 py-3 text-xl"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !text.trim()}
            className="rounded-2xl bg-[var(--zone)] px-5 py-4 text-[var(--zone-foreground)] disabled:opacity-60"
            aria-label="ส่งคำตอบ"
          >
            {mutation.isPending ? (
              <Loader2 className="size-7 animate-spin" />
            ) : (
              <Send className="size-7" />
            )}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}
