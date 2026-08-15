"use client";

import { Callout } from "seed-design/ui/callout";
import { useEffect, useState } from "react";

type State = { status: string; summary: string | null; available: boolean };

const waitingCopy = "사진과 공개 정보를 바탕으로 이 친구의 매력을 살펴보고 있어요. 곧 따뜻한 소개가 준비돼요.";
const unavailableCopy = "사진과 공개 정보를 바탕으로 한 소개를 준비하고 있어요. 공개된 동물 정보와 보호소 메모는 위에서 확인할 수 있어요.";
const failedCopy = "소개를 준비하는 동안 잠시 어려움이 있었어요. 공개 정보와 사진을 기준으로 천천히 살펴봐 주세요.";

export function AnimalAiIntro({ animalId }: { animalId: string }) {
  const [state, setState] = useState<State>({ status: "loading", summary: null, available: true });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(`/api/animal-ai?animalId=${encodeURIComponent(animalId)}`, { cache: "no-store" });
      const next = await response.json() as State;
      if (!active) return;
      setState(next);
      if (next.status === "missing") {
        const queuedResponse = await fetch("/api/animal-ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId }) });
        if (active && queuedResponse.ok) setState(await queuedResponse.json() as State);
      }
    };
    void load().catch(() => active && setState({ status: "failed", summary: null, available: false }));
    return () => { active = false; };
  }, [animalId]);

  const description = state.summary || (state.available && ["loading", "missing", "pending", "processing"].includes(state.status) ? waitingCopy : state.status === "unavailable" ? unavailableCopy : failedCopy);
  return <section className="ff-detail-ai-section" aria-labelledby="animal-ai-title">
    <Callout
      tone="neutral"
      title={<span id="animal-ai-title">AI가 발견한 이 친구의 매력</span>}
      description={<><strong className="ff-detail-ai-intro-title">이 친구를 소개할게요</strong><span className="ff-detail-ai-copy">{description}</span><span className="ff-detail-ai-disclaimer">사진을 바탕으로 AI가 살펴본 내용이에요. 정확한 건강·성격 정보와 입양 가능 여부는 보호소에 확인해 주세요.</span></>}
    />
  </section>;
}
