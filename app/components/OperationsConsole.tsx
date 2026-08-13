/* eslint-disable no-empty */
"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Badge } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "seed-design/ui/tabs";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { useAppFeedback } from "./AppFeedback";

type ApplicationItem = {
  id: number | string;
  animal?: string;
  animalId?: string;
  status: string;
  score?: number;
  readinessScore?: number;
  suitabilityScore?: number;
  suitabilityJson?: string;
};
type RegistrationItem = {
  id: number | string;
  name: string;
  region?: string;
  status: string;
};
type SafetyItem = {
  id: number | string;
  targetType?: string;
  targetId?: string;
  requestedRole?: string;
  organization?: string;
  reason?: string;
  purpose?: string;
  title?: string;
  animalId?: string;
  targetAmount?: number;
  status?: string;
  severity?: string;
  action?: string;
  createdAt?: string;
  applicationId?: number;
  urgency?: string;
  safeUntil?: string;
  shelterName?: string;
  animalName?: string;
  source?: string;
  evidenceKey?: string;
};
type Data = {
  summary: Record<string, number>;
  applications: ApplicationItem[];
  registrations: RegistrationItem[];
  verifications?: SafetyItem[];
  reports?: SafetyItem[];
  returns?: SafetyItem[];
  audits?: SafetyItem[];
  certifications?: SafetyItem[];
  appeals?: SafetyItem[];
  fundraisers?: SafetyItem[];
};

export function OperationsConsole() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [section, setSection] = useState("applications");
  const feedback = useAppFeedback();
  const load = () =>
    fetch(`/api/operations?section=${encodeURIComponent(section)}`)
      .then((response) => response.json())
      .then((body) => (body.error ? setError(body.error) : setData(body)));
  useEffect(() => {
    load();
    // The selected tab is the only part of the request that changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);
  async function act(payload: Record<string, unknown>) {
    const response = await fetch("/api/operations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const message = (await response.json()).error;
      setError(message);
      feedback.error(message);
    } else {
      setError("");
      feedback.success("운영 상태를 반영했어요");
      load();
    }
  }
  if (!data)
    return (
      <div className="ff-empty">
        {error || "운영 데이터를 불러오고 있어요."}
      </div>
    );
  return (
    <>
      <div className="ff-dashboard-grid ff-ops-summary">
        <div>
          <strong>{data.summary.applications}</strong>
          <span>입양 신청</span>
        </div>
        <div>
          <strong>{data.summary.reviews}</strong>
          <span>등록 심사</span>
        </div>
        <div>
          <strong>{data.summary.reports}</strong>
          <span>안전 신고</span>
        </div>
        <div>
          <strong>{data.summary.returns}</strong>
          <span>반환 도움</span>
        </div>
      </div>
      {error && <Callout tone="critical" description={error} />}
      <TabsRoot value={section} onValueChange={setSection}>
        <TabsList>
          <TabsTrigger value="applications">입양 신청</TabsTrigger>
          <TabsTrigger value="registrations">등록·인증</TabsTrigger>
          <TabsTrigger value="safety">도움·신고·감사</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <Callout
            tone="informative"
            description="자신이 담당하는 동물의 신청자만 적합도 순으로 표시합니다. 점수는 자동 탈락 기준이 아니며 이유와 상담을 함께 봅니다."
          />
          <div className="ff-ops-list">
            {data.applications.map((item) => {
              let fit: { reasons?: string[]; concerns?: string[] } = {};
              try {
                fit = JSON.parse(item.suitabilityJson || "{}");
              } catch {}
              const value =
                item.suitabilityScore || item.score || item.readinessScore || 0;
              return (
                <article key={item.id}>
                  <ProgressCircle
                    value={value}
                    aria-label={`적합도 ${value}점`}
                  />
                  <div className="ff-grow">
                    <span className="ff-kicker">신청 {item.id}</span>
                    <h3>{item.animal || item.animalId}</h3>
                    <p>
                      적합도 {value}점 · 준비도 {item.readinessScore || "-"}점 ·{" "}
                      {item.status}
                    </p>
                    {fit.reasons?.length ? (
                      <small>잘 맞는 점: {fit.reasons.join(" · ")}</small>
                    ) : null}
                    {fit.concerns?.length ? (
                      <small>상담할 점: {fit.concerns.join(" · ")}</small>
                    ) : null}
                  </div>
                  <div className="ff-ops-actions">
                    <ActionButton
                      size="small"
                      variant="neutralWeak"
                      onClick={() => {
                        const body = window.prompt(
                          "신청자에게 보낼 상담 메시지를 입력하세요.",
                        );
                        if (body)
                          act({
                            action: "guardian-message",
                            id: item.id,
                            body,
                          });
                      }}
                    >
                      메시지
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="neutralWeak"
                      onClick={() =>
                        act({
                          action: "application-status",
                          id: item.id,
                          status: "consulting",
                          note: "상담 시작",
                        })
                      }
                    >
                      상담
                    </ActionButton>
                    <ActionButton
                      size="small"
                      onClick={() =>
                        act({
                          action: "application-status",
                          id: item.id,
                          status: "approved",
                          note: "보호처 최종 승인",
                        })
                      }
                    >
                      승인
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="neutralWeak"
                      onClick={() =>
                        act({
                          action: "guardian-confirm-handover",
                          id: item.id,
                        })
                      }
                    >
                      인계 확인
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="criticalSolid"
                      onClick={() =>
                        act({
                          action: "application-status",
                          id: item.id,
                          status: "rejected",
                          note: "운영자 검토 종료",
                        })
                      }
                    >
                      종료
                    </ActionButton>
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="registrations">
          <div className="ff-ops-list">
            {data.registrations.map((item) => (
              <article key={item.id}>
                <div className="ff-grow">
                  <span className="ff-kicker">직접 등록 {item.id}</span>
                  <h3>{item.name}</h3>
                  <p>
                    {item.region || item.status} · {item.status}
                  </p>
                </div>
                <div className="ff-ops-actions">
                  <ActionButton
                    size="small"
                    onClick={() =>
                      act({
                        action: "registration-status",
                        id: item.id,
                        status: "published",
                      })
                    }
                  >
                    공개
                  </ActionButton>
                  <ActionButton
                    size="small"
                    variant="criticalSolid"
                    onClick={() =>
                      act({
                        action: "registration-status",
                        id: item.id,
                        status: "closed",
                      })
                    }
                  >
                    종료
                  </ActionButton>
                </div>
              </article>
            ))}
            {(data.verifications || []).map((item) => (
              <article key={`v-${item.id}`}>
                <div className="ff-grow">
                  <h3>{item.requestedRole} 인증 요청</h3>
                  <p>
                    {item.organization || "개인 임시보호"} · {item.status}
                  </p>
                </div>
                <div className="ff-ops-actions">
                  {item.evidenceKey && (
                    <ActionButton asChild size="small" variant="neutralWeak">
                      <a
                        href={`/api/operations/evidence?key=${encodeURIComponent(item.evidenceKey)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        증빙 확인
                      </a>
                    </ActionButton>
                  )}
                  <ActionButton
                    size="small"
                    onClick={() =>
                      act({
                        action: "verification-status",
                        id: item.id,
                        status: "verified",
                      })
                    }
                  >
                    인증
                  </ActionButton>
                  <ActionButton
                    size="small"
                    variant="criticalSolid"
                    onClick={() =>
                      act({
                        action: "verification-status",
                        id: item.id,
                        status: "rejected",
                      })
                    }
                  >
                    반려
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="safety">
          <Callout
            tone="informative"
            title="신고 50건 자동 블라인드"
            description="신고자는 제재 대상이 아닙니다. 대상 소유자를 확인한 뒤 제재하며 모든 조치는 감사 기록에 남습니다."
          />
          <div className="ff-ops-list">
            {(data.fundraisers || []).map((item) => (
              <article key={`fund-${item.id}`}>
                <div className="ff-grow">
                  <Badge tone="warning" variant="weak">동물별 검증 모금</Badge>
                  <h3>{item.title} · {item.animalId}</h3>
                  <p>{item.purpose} · 목표 {(item.targetAmount || 0).toLocaleString()}원 · {item.status}</p>
                </div>
                {item.status === "review" && <div className="ff-ops-actions">
                  <ActionButton size="small" onClick={() => act({ action: "fundraiser-status", id: item.id, status: "open" })}>공개 승인</ActionButton>
                  <ActionButton size="small" variant="criticalSolid" onClick={() => act({ action: "fundraiser-status", id: item.id, status: "rejected" })}>반려</ActionButton>
                </div>}
              </article>
            ))}
            {(data.certifications || []).map((item) => (
              <article key={`cert-${item.id}`}>
                <div className="ff-grow">
                  <Badge tone="informative" variant="weak">
                    외부 입양 인증
                  </Badge>
                  <h3>
                    {item.animalName} · {item.shelterName}
                  </h3>
                  <p>{item.status}</p>
                </div>
                {item.status === "submitted" && (
                  <div className="ff-ops-actions">
                    <ActionButton
                      size="small"
                      onClick={() =>
                        act({
                          action: "adoption-certification-status",
                          id: item.id,
                          status: "verified",
                        })
                      }
                    >
                      인증
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="criticalSolid"
                      onClick={() =>
                        act({
                          action: "adoption-certification-status",
                          id: item.id,
                          status: "rejected",
                        })
                      }
                    >
                      반려
                    </ActionButton>
                  </div>
                )}
              </article>
            ))}
            {(data.appeals || []).map((item) => (
              <article key={`appeal-${item.id}`}>
                <div className="ff-grow">
                  <Badge tone="warning" variant="weak">
                    제재 이의제기
                  </Badge>
                  <h3>이의제기 #{item.id}</h3>
                  <p>
                    {item.reason} · {item.status}
                  </p>
                </div>
                {item.status === "submitted" && (
                  <div className="ff-ops-actions">
                    <ActionButton
                      size="small"
                      onClick={() =>
                        act({
                          action: "appeal-status",
                          id: item.id,
                          status: "accepted",
                        })
                      }
                    >
                      제재 해제
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="criticalSolid"
                      onClick={() =>
                        act({
                          action: "appeal-status",
                          id: item.id,
                          status: "rejected",
                        })
                      }
                    >
                      기각
                    </ActionButton>
                  </div>
                )}
              </article>
            ))}
            {(data.returns || []).map((item) => (
              <article key={`return-${item.id}`}>
                <div className="ff-grow">
                  <Badge
                    tone={item.urgency === "emergency" ? "critical" : "warning"}
                    variant="weak"
                  >
                    {item.urgency}
                  </Badge>
                  <h3>돌봄 위기 요청 · 신청 #{item.applicationId}</h3>
                  <p>
                    {item.reason} · 돌봄 가능 시점 {item.safeUntil || "미정"} ·{" "}
                    {item.status}
                  </p>
                </div>
                {item.status !== "resolved" && (
                  <div className="ff-ops-actions">
                    <ActionButton
                      size="small"
                      onClick={() =>
                        act({
                          action: "return-status",
                          id: item.id,
                          status: "connected",
                        })
                      }
                    >
                      도움 연결
                    </ActionButton>
                    <ActionButton
                      size="small"
                      variant="neutralWeak"
                      onClick={() =>
                        act({
                          action: "return-status",
                          id: item.id,
                          status: "resolved",
                        })
                      }
                    >
                      해결 완료
                    </ActionButton>
                  </div>
                )}
              </article>
            ))}
            {(data.reports || []).map((item) => (
              <article key={`r-${item.id}`}>
                <div className="ff-grow">
                  <Badge
                    tone={item.severity === "critical" ? "critical" : "warning"}
                    variant="weak"
                  >
                    {item.severity || "normal"}
                  </Badge>
                  <h3>
                    {item.targetType} #{item.targetId}
                  </h3>
                  <p>{item.reason}</p>
                </div>
                <div className="ff-ops-actions">
                  {item.targetType === "post" && (
                    <>
                      <ActionButton
                        size="small"
                        variant="criticalSolid"
                        onClick={() =>
                          act({
                            action: "post-visibility",
                            id: Number(item.targetId),
                            hidden: true,
                          })
                        }
                      >
                        숨김
                      </ActionButton>
                      <ActionButton
                        size="small"
                        variant="neutralWeak"
                        onClick={() =>
                          act({
                            action: "post-visibility",
                            id: Number(item.targetId),
                            hidden: false,
                          })
                        }
                      >
                        복구
                      </ActionButton>
                    </>
                  )}
                  <ActionButton
                    size="small"
                    variant="criticalSolid"
                    onClick={() =>
                      act({
                        action: "account-sanction-target",
                        id: item.id,
                        note: "운영자 신고 검토 후 제재 확정",
                      })
                    }
                  >
                    대상 계정 제재
                  </ActionButton>
                </div>
              </article>
            ))}
            {(data.audits || []).map((item) => (
              <article key={`a-${item.id}`}>
                <div>
                  <span className="ff-kicker">감사 기록</span>
                  <h3>{item.action}</h3>
                  <p>
                    {item.targetType} #{item.targetId} · {item.createdAt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      </TabsRoot>
    </>
  );
}
