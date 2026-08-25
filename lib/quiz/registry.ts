import type { QuizDefinition } from "./types";
import { careReadinessQuestions } from "./care-readiness";
import { petKnowledgeQuestions } from "./pet-knowledge";

const quizDefinitions: Record<string, QuizDefinition> = {
  "care-readiness": {
    slug: "care-readiness",
    title: "입양 환경 점검",
    renderer: "care-readiness",
    questions: careReadinessQuestions,
    showSpeciesSelection: false,
    persistResult: false,
    shareable: false,
    metadata: {
      title: "함께할 수 있는 생활인지 확인",
      description: "시간·공간·비용을 기준으로 반려동물과 함께할 생활을 점검해 보세요.",
    },
    intro: {
      badge: "입양 환경 점검",
      title: "반려동물과\n함께할 수 있을까요?",
      lead: "",
    },
  },
  "adoption-prep": {
    slug: "adoption-prep",
    title: "입양 전 준비 확인",
    renderer: "adoption-readiness",
    showSpeciesSelection: true,
    persistResult: true,
    shareable: true,
    metadata: {
      title: "입양 전 준비 확인",
      description: "반려동물과 함께할 준비가 되었는지 확인해 보세요.",
    },
    intro: {
      badge: "입양 준비 체크",
      title: "반려동물과\n함께할 준비하기",
      lead: "입양 전 필요한 내용을 확인해 보세요.",
    },
  },
  "pet-knowledge": {
    slug: "pet-knowledge",
    title: "상식 퀴즈",
    renderer: "adoption-readiness",
    questions: petKnowledgeQuestions,
    showSpeciesSelection: false,
    persistResult: false,
    shareable: true,
    metadata: {
      title: "상식 퀴즈",
      description: "반려동물과 함께하기 전에 알아두면 좋은 내용을 확인해 보세요.",
    },
    intro: {
      badge: "상식 퀴즈",
      title: "반려동물과\n더 가까워지는 상식",
      lead: "",
    },
  },
};

export function getQuizDefinition(slug: string) {
  return quizDefinitions[slug] ?? null;
}

export function getQuizSlugs() {
  return Object.keys(quizDefinitions);
}
