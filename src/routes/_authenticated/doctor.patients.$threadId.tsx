import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { getPatientThread, replyToPatient } from "@/lib/doctor.functions";

export const Route = createFileRoute("/_authenticated/doctor/patients/$threadId")({
  component: DoctorThread,
});

function DoctorThread() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchThread = useServerFn(getPatientThread);
  const sendReply = useServerFn(replyToPatient);
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xl ${
                  m.role === "user"
                    ? "bg-secondary"
                    : "ml-auto bg-[var(--zone)] text-[var(--zone-foreground)]"
                }`}
              >
                {m.content}
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
