"use client";

import { useEffect, useState } from "react";
import { Badge } from "seed-design/ui/badge";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { IconCheckmarkCircleFill, IconCheckmarkShieldFill } from "@karrotmarket/react-monochrome-icon";
import { ReadinessQuiz } from "./ReadinessQuiz";
import { PetCostCalculator } from "./PetCostCalculator";

type Assessment = { passed?: boolean };
type Status = "loading" | "guest" | "incomplete" | "completed";

export function AdoptionPlanningCard(props: { species: string; breed: string; animalAge: string }) {
  void props;
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/readiness")
      .then(async response => {
        if (response.status === 401) return { guest: true };
        if (!response.ok) throw new Error("readiness_unavailable");
        return response.json() as Promise<{ assessment?: Assessment | null }>;
      })
      .then(body => {
        if (!active) return;
        if ("guest" in body) setStatus("guest");
        else setStatus(body.assessment?.passed ? "completed" : "incomplete");
      })
      .catch(() => { if (active) setStatus("guest"); });
    return () => { active = false; };
  }, []);

  const loading = status === "loading";
  const completed = status === "completed";
  const statusLabel = loading ? "확인 중" : completed ? "수료" : "미수료";
  const statusDescription = loading
    ? "입양 전 상식시험 수료 여부를 확인하고 있어요."
    : completed
      ? "입양 전 상식시험 4단계를 모두 확인했어요."
      : "입양 전 상식시험을 아직 모두 확인하지 않았어요.";

  return (
    <section className="ff-adoption-planning" aria-labelledby="adoption-planning-title">
      <div className="ff-section-head">
        <div>
          <div className="ff-kicker">입양 전에 꼭 확인해요</div>
          <h2 className="ff-section-title" id="adoption-planning-title">반려동물 상식시험</h2>
        </div>
        <Badge tone={completed ? "positive" : "neutral"} variant="weak">참고용</Badge>
      </div>
      <div className={`ff-adoption-test-status${completed ? " is-completed" : ""}`} role="status" aria-live="polite">
        <div className="ff-adoption-test-status-icon" aria-hidden>
          {completed ? <IconCheckmarkCircleFill /> : <IconCheckmarkShieldFill />}
        </div>
        <div>
          <strong>{statusLabel}</strong>
          <p>{statusDescription}</p>
          <small>수료 여부는 입양 가능 여부나 적합도를 판단하는 기준이 아니에요.</small>
        </div>
      </div>
      <BottomSheetRoot>
        <BottomSheetTrigger asChild>
          <button className="ff-adoption-test-trigger" type="button">
            {completed ? "시험 내용 다시 확인하기" : "입양 전 상식시험 시작하기"}
          </button>
        </BottomSheetTrigger>
        <BottomSheetContent className="ff-adoption-test-sheet" title="입양 전 상식시험" description="새 가족을 맞이하기 전에 생활 환경과 기본 돌봄 내용을 확인해요." showHandle>
          <BottomSheetBody>
            <ReadinessQuiz />
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheetRoot>
      <PetCostCalculator species={props.species} />
      <p className="ff-adoption-planning-note">시험 결과는 입양 전 준비를 돕기 위한 참고 정보예요. 최종 상담과 입양 결정은 보호소와 함께 확인해 주세요.</p>
    </section>
  );
}
