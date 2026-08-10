"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { useAppFeedback } from "./AppFeedback";
type Campaign = {
  id: number;
  title: string;
  purpose: string;
  targetAmount: number;
  raisedAmount: number;
  status: string;
};
export function AnimalFundraiserPanel({
  animalId,
  shelterName,
}: {
  animalId: string;
  shelterName: string;
}) {
  const [rows, setRows] = useState<Campaign[]>([]),
    feedback = useAppFeedback();
  useEffect(() => {
    fetch(`/api/community?type=fundraisers&id=${encodeURIComponent(animalId)}`)
      .then((r) => r.json())
      .then((b) => setRows(b.fundraisers || []));
  }, [animalId]);
  async function pledge(id: number, amount: number) {
    const r = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "fund-pledge",
          fundraiserId: id,
          amount,
        }),
      }),
      b = await r.json();
    if (r.status === 401) {
      window.location.assign(`/login?return_to=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (r.ok) feedback.success(b.message);
    else feedback.error(b.error);
  }
  const open = rows.filter((row) => row.status === "open");
  return (
    <section className="ff-fund-panel">
      <div className="ff-kicker">입양하지 못해도 실제 도움</div>
      <h2>이 친구를 위한 검증 모금</h2>
      <p>
        {shelterName}이 치료 견적·사용 목적을 제출하고 운영자가 공개 승인한
        캠페인만 표시합니다.
      </p>
      {open.map((row) => (
        <article key={row.id}>
          <h3>{row.title}</h3>
          <p>{row.purpose}</p>
          <div className="ff-fund-progress">
            <span
              style={{
                width: `${Math.min(100, (row.raisedAmount / row.targetAmount) * 100)}%`,
              }}
            />
          </div>
          <strong>
            {row.raisedAmount.toLocaleString()}원 /{" "}
            {row.targetAmount.toLocaleString()}원
          </strong>
          <div className="ff-pledge-buttons">
            {[3000, 5000, 10000].map((amount) => (
              <ActionButton
                key={amount}
                size="small"
                onClick={() => pledge(row.id, amount)}
              >
                {amount.toLocaleString()}원
              </ActionButton>
            ))}
          </div>
        </article>
      ))}
      {!open.length && (
        <Callout
          tone="informative"
          title="현재 검증 완료된 모금이 없어요"
          description="보호소가 치료·간식·환경개선 목적과 목표금액을 제출하고 운영자 승인을 받은 뒤에만 참여 버튼이 열립니다."
        />
      )}
      <p className="ff-meta">
        결제 사업자 연동 전에는 참여 의향만 기록되고 실제 청구되지 않습니다.
        모금액은 보호소 일반 운영비와 분리해 사용 결과를 공개해야 합니다.
      </p>
    </section>
  );
}
