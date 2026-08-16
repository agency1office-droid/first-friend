"use client";

import { useState } from "react";
import { IconDot3VerticalLine } from "@karrotmarket/react-monochrome-icon";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "seed-design/ui/alert-dialog";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
import { useAppFeedback } from "./AppFeedback";

export function AnimalReportButton({ animalId }: { animalId: string }) {
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(false);
  const feedback = useAppFeedback();

  async function report() {
    const trimmedReason = reason.trim();
    if (loading || reported || trimmedReason.length < 5) return;
    setLoading(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "animal", targetId: animalId, reason: trimmedReason }),
      });
      if (response.status === 401) {
        window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!response.ok) throw new Error("report_failed");
      setReported(true);
      feedback.success("신고를 접수했어요");
    } catch {
      feedback.error("신고를 접수하지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialogRoot>
      <AlertDialogTrigger asChild>
        <button className="ff-detail-image-more" type="button" aria-label="이 동물 신고하기" disabled={reported}>
          <IconDot3VerticalLine aria-hidden />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이 친구 정보를 신고할까요?</AlertDialogTitle>
          <AlertDialogDescription>공공 정보 오류나 안전과 관련된 내용을 알려주시면 운영자가 확인할게요.</AlertDialogDescription>
        </AlertDialogHeader>
        <TextField label="신고 사유">
          <TextFieldTextarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} placeholder="확인이 필요한 내용을 적어 주세요." />
        </TextField>
        <AlertDialogFooter>
          <AlertDialogAction variant="criticalSolid" disabled={loading || reason.trim().length < 5} onClick={report}>
            {reported ? "접수됨" : loading ? "접수 중…" : "신고 접수"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
