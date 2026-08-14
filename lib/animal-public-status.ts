import type { Animal } from "./data";
import { currentServerTimestamp } from "./server-time";

export function publicOutcomeLabel(state: string) {
  if (state.includes("입양")) return "새 가족을 만났어요";
  if (state.includes("반환") || state.includes("인도")) return "가족에게 돌아갔어요";
  if (state.includes("기증")) return "다른 보호처로 연결됐어요";
  if (state.includes("방사")) return "보호 절차가 종료됐어요";
  if (state.includes("자연사")) return "보호 중 세상을 떠났어요";
  if (state.includes("안락사")) return "인도적 처리로 보호가 종료됐어요";
  return "보호 절차가 종료됐어요";
}

function noticeEndDate(notice: string | undefined) {
  if (!notice) return null;
  const dates = [...notice.matchAll(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./g)];
  const last = dates.at(-1);
  if (!last) return null;
  return new Date(Number(last[1]), Number(last[2]) - 1, Number(last[3]), 23, 59, 59);
}

export function getNoticeDaysRemaining(notice: string | undefined) {
  const endDate = noticeEndDate(notice);
  if (!endDate) return null;
  return Math.max(0, Math.ceil((endDate.getTime() - currentServerTimestamp()) / 86_400_000));
}

export function getAnimalPublicStatus(animal: Animal) {
  const notice = animal.life.find((item) => item.startsWith("공고 "));
  const publicState = animal.health.find((item) => item.startsWith("현재 상태:"))?.replace("현재 상태:", "").trim() || "";
  const noticeEnd = noticeEndDate(notice);
  const noticeEnded = Boolean(noticeEnd && noticeEnd.getTime() < currentServerTimestamp());
  const processEnded = publicState.startsWith("종료");
  const noticeDeadline = noticeEnd ? `${noticeEnd.getMonth() + 1}월 ${noticeEnd.getDate()}일` : "공고문에 표시된 날";

  if (!notice) return { notice, publicState, processEnded, noticeEnded, phase: "unknown" as const, cardLabel: "현재 상태 확인 필요", statusLabel: "현재 상태 확인 필요", tone: "neutral" as const, detailTitle: "보호소에 현재 상태를 확인해 주세요", description: "공공데이터에서 보호자 확인 공고 기간을 확인하지 못했어요. 입양 가능 여부를 추측하지 않고 보호소 확인이 필요하다고 표시합니다." };
  if (processEnded) {
    const outcome = publicOutcomeLabel(publicState);
    return { notice, publicState, processEnded, noticeEnded, phase: "ended" as const, cardLabel: outcome, statusLabel: outcome, tone: "neutral" as const, detailTitle: outcome, description: `공공데이터의 현재 처리 상태는 '${publicState}'입니다. 종료된 공고는 입양 신청 대상으로 표시하지 않습니다.` };
  }
  if (noticeEnded) return { notice, publicState, processEnded, noticeEnded, phase: "protected" as const, cardLabel: "입양 상담 가능", statusLabel: "입양 상담 가능", tone: "warning" as const, detailTitle: "입양 상담을 시작할 수 있어요", description: `보호자 확인 공고가 끝나고 공공데이터에 '${publicState || "보호 중"}'으로 표시된 친구예요. 상담 이후 실제 입양 가능 여부와 절차는 보호소가 확인합니다.` };
  return { notice, publicState, processEnded, noticeEnded, phase: "notice" as const, cardLabel: "보호자 확인 공고 중", statusLabel: "보호자 확인 공고 중", tone: "informative" as const, detailTitle: `${noticeDeadline}까지 보호자를 확인해요`, description: "잃어버린 동물일 수 있어 원래 보호자를 확인하고 있어요. 공고 기간에는 입양 대상으로 안내하지 않습니다." };
}

export type AnimalPublicStatusFilter = "all" | "notice" | "checking";

export function matchesAnimalPublicStatus(animal: Animal, filter: AnimalPublicStatusFilter | string | undefined) {
  if (!filter || filter === "all") return true;
  const status = getAnimalPublicStatus(animal);
  if (filter === "notice") return Boolean(status.notice && !status.noticeEnded && !status.processEnded);
  if (filter === "checking") return Boolean(status.notice && status.noticeEnded && !status.processEnded);
  return true;
}
