"use client";
import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { Callout } from "seed-design/ui/callout";
import { useAppFeedback } from "./AppFeedback";
type Suggestion = {
  id: number;
  name: string;
  reason: string;
  votes: number;
  selected: boolean;
};
export function NameSuggestionBox({
  animalId,
  currentName,
}: {
  animalId: string;
  currentName: string;
}) {
  const [items, setItems] = useState<Suggestion[]>([]),
    feedback = useAppFeedback();
  const load = useCallback(() =>
    fetch(`/api/community?type=names&id=${encodeURIComponent(animalId)}`)
      .then(async (response) => {
        if (!response.ok) return { suggestions: [] };
        const body = await response.text();
        return body ? JSON.parse(body) : { suggestions: [] };
      })
      .then((body) => setItems(body.suggestions || []))
      .catch(() => setItems([])), [animalId]);
  useEffect(() => { void load(); }, [load]);
  async function suggest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      r = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "name-suggest",
          animalId,
          name: f.get("name"),
          reason: f.get("reason"),
        }),
      });
    if (r.status === 401) {
      window.location.assign(`/login?return_to=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (r.ok) {
      e.currentTarget.reset();
      feedback.success("이름을 보호소 후보 목록에 보냈어요");
      load();
    }
  }
  async function vote(id: number) {
    const r = await fetch("/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "name-vote", suggestionId: id }),
    });
    if (r.status === 401) {
      window.location.assign(`/login?return_to=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (r.ok) {
      feedback.success("마음을 보탰어요");
      load();
    }
  }
  return (
    <section className="ff-play-card">
      <div className="ff-kicker">번호 대신 기억할 이름</div>
      <h2>
        {currentName.includes("·")
          ? "이 친구에게 이름을 선물해 주세요"
          : "다른 이름도 제안할 수 있어요"}
      </h2>
      <p>
        사람들이 제안하고 응원한 이름을 입점 보호소 담당자가 최종 선택할 수
        있어요.
      </p>
      <form className="ff-inline-form" onSubmit={suggest}>
        <TextField label="이름">
          <TextFieldInput name="name" maxLength={20} required />
        </TextField>
        <TextField label="이름을 떠올린 이유">
          <TextFieldInput name="reason" maxLength={200} />
        </TextField>
        <ActionButton>제안</ActionButton>
      </form>
      <div className="ff-chip-results">
        {items.slice(0, 8).map((item) => (
          <button key={item.id} onClick={() => vote(item.id)}>
            <strong>{item.name}</strong>
            <span>♥ {item.votes}</span>
          </button>
        ))}
      </div>
      {!items.length && (
        <Callout
          tone="informative"
          description="아직 제안된 이름이 없어요. 첫 이름을 선물해 주세요."
        />
      )}
    </section>
  );
}
