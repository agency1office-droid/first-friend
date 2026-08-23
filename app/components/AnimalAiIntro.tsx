"use client";

import { Callout } from "seed-design/ui/callout";
import { IconSparkle2Fill } from "@karrotmarket/react-monochrome-icon";
import { useEffect, useState } from "react";
import { LoadingIndicator } from "./LoadingIndicator";

type State = { status: string; summary: string | null; available: boolean; source?: "ai" | "public-data" };

const waitingCopy = "사진과 공개 정보를 바탕으로 이 친구의 매력을 살펴보고 있어요. 곧 따뜻한 소개가 준비돼요.";
const unavailableCopy = "사진과 공개 정보를 바탕으로 한 소개를 준비하고 있어요. 공개된 동물 정보와 보호소 메모는 위에서 확인할 수 있어요.";
const failedCopy = "소개를 준비하는 동안 잠시 어려움이 있었어요. 공개 정보와 사진을 기준으로 천천히 살펴봐 주세요.";

export function AnimalAiIntro({ animalId }: { animalId: string }) {
  const [state, setState] = useState<State>({ status: "loading", summary: null, available: true });

  useEffect(() => {
    let active = true;
    const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));
    const poll = async () => {
      for (let attempt = 0; attempt < 6 && active; attempt += 1) {
        await wait(2500);
        const response = await fetch(`/api/animal-ai?animalId=${encodeURIComponent(animalId)}`, { cache: "no-store" });
        const next = await response.json() as State;
        if (!active) return;
        setState(next);
        if (!["pending", "processing"].includes(next.status)) return;
      }
    };
    const load = async () => {
      const response = await fetch(`/api/animal-ai?animalId=${encodeURIComponent(animalId)}`, { cache: "no-store" });
      const next = await response.json() as State;
      if (!active) return;
      let current = next;
      if (next.status === "missing" || next.status === "failed") {
        const queuedResponse = await fetch("/api/animal-ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId }) });
        if (active && queuedResponse.ok) current = await queuedResponse.json() as State;
      }
      if (!active) return;
      setState(current);
      if (["pending", "processing"].includes(current.status)) await poll();
    };
    void load().catch(() => active && setState({ status: "failed", summary: null, available: false }));
    return () => { active = false; };
  }, [animalId]);

  const isPending = !state.summary && state.available && ["loading", "missing", "pending", "processing"].includes(state.status);
  const description = state.summary || (isPending ? waitingCopy : state.status === "unavailable" ? unavailableCopy : failedCopy);
  const title = state.source === "public-data" ? "사진과 공개 정보로 살펴본 이 친구의 매력" : "AI가 살펴본 이 친구의 매력";
  const disclaimer = state.source === "public-data" ? "AI 소개를 준비하지 못해 공개된 정보와 사진을 바탕으로 안내해요. 정확한 건강·성격 정보와 입양 가능 여부는 보호소에 확인해 주세요." : "사진을 바탕으로 AI가 살펴본 내용이에요. 정확한 건강·성격 정보와 입양 가능 여부는 보호소에 확인해 주세요.";
  return <section className="ff-detail-ai-section" aria-labelledby="animal-ai-title">
    <Callout
      tone="neutral"
      title={<span id="animal-ai-title"><IconSparkle2Fill aria-hidden="true" focusable="false" /> <span>{title}</span></span>}
      description={<><span className={`ff-detail-ai-copy${isPending ? " ff-detail-ai-copy--pending" : ""}`}>{isPending && <LoadingIndicator label="AI 소개를 준비하는 중" />}{description}</span><span className="ff-detail-ai-disclaimer">{disclaimer}</span></>}
    />
  </section>;
}
