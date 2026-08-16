"use client";

import { useState } from "react";
import { IconChevronRightLine, IconDot3VerticalLine, IconExclamationmarkCircleLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
import { useAppFeedback } from "./AppFeedback";

type ReportStage = "menu" | "reasons" | "detail";

const reportReasons = [
  ["공공 정보가 잘못됐어요", "보호 상태·품종·주소 등 공개 정보가 실제와 달라요."],
  ["사진이나 내용이 부적절해요", "동물과 관련 없는 사진이나 불편한 내용이 포함되어 있어요."],
  ["동일한 친구가 중복 등록됐어요", "같은 동물의 공고가 여러 번 등록되어 있어요."],
  ["보호소 정보가 맞지 않아요", "보호소 이름이나 연락처가 실제 정보와 달라요."],
  ["기타 사유가 있어요", "위 항목에 해당하지 않는 내용을 알려주세요."],
] as const;

export function AnimalReportButton({ animalId }: { animalId: string }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<ReportStage>("menu");
  const [selectedReason, setSelectedReason] = useState("");
  const [detail, setDetail] = useState("");
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(false);
  const feedback = useAppFeedback();

  function close() {
    setOpen(false);
    setStage("menu");
    setSelectedReason("");
    setDetail("");
  }

  async function report() {
    const reason = [selectedReason, detail.trim()].filter(Boolean).join("\n");
    if (loading || reported || !selectedReason || detail.trim().length < 5) return;
    setLoading(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "animal", targetId: animalId, reason }),
      });
      if (response.status === 401) {
        window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!response.ok) throw new Error("report_failed");
      setReported(true);
      close();
      feedback.success("신고를 접수했어요");
    } catch {
      feedback.error("신고를 접수하지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheetRoot open={open} onOpenChange={nextOpen => { if (nextOpen) setOpen(true); else close(); }}>
      <BottomSheetTrigger asChild>
        <button className="ff-detail-image-more" type="button" aria-label="이 동물 신고하기" disabled={reported}>
          <IconDot3VerticalLine aria-hidden />
        </button>
      </BottomSheetTrigger>
      <BottomSheetContent
        title={stage === "menu" ? "더보기" : stage === "reasons" ? "신고할 이유를 선택해주세요" : selectedReason}
        description={stage === "menu" ? "이 친구 정보에 필요한 작업을 선택해 주세요." : stage === "reasons" ? "정확한 이유를 알려주시면 운영자가 확인할게요." : "확인이 필요한 내용을 자세히 적어 주세요."}
        showHandle
      >
        {stage === "menu" && <BottomSheetBody>
          <div className="ff-detail-report-menu" role="menu" aria-label="동물 정보 메뉴">
            <button type="button" role="menuitem" onClick={() => setStage("reasons")}>
              <IconExclamationmarkCircleLine aria-hidden />
              <span>신고하기</span>
              <IconChevronRightLine aria-hidden />
            </button>
          </div>
        </BottomSheetBody>}
        {stage === "reasons" && <BottomSheetBody>
          <div className="ff-detail-report-reasons" role="listbox" aria-label="신고 이유">
            {reportReasons.map(([title, description]) => <button type="button" role="option" aria-selected={selectedReason === title} key={title} onClick={() => { setSelectedReason(title); setStage("detail"); }}>
              <span><strong>{title}</strong><small>{description}</small></span>
              <IconChevronRightLine aria-hidden />
            </button>)}
          </div>
        </BottomSheetBody>}
        {stage === "detail" && <>
          <BottomSheetBody>
            <TextField label="신고 내용">
              <TextFieldTextarea value={detail} onChange={event => setDetail(event.target.value)} minLength={5} placeholder="확인이 필요한 내용을 적어 주세요." />
            </TextField>
          </BottomSheetBody>
          <BottomSheetFooter>
            <ActionButton variant="criticalSolid" disabled={loading || detail.trim().length < 5} onClick={report}>
              {loading ? "접수 중…" : "신고하기"}
            </ActionButton>
          </BottomSheetFooter>
        </>}
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
