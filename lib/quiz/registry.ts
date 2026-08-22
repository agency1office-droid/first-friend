import type { QuizDefinition } from "./types";
import { petKnowledgeQuestions } from "./pet-knowledge";

const quizDefinitions: Record<string, QuizDefinition> = {
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
      badge: "퍼스트프렌드 준비 가이드",
      title: "반려동물과 함께할 준비하기",
      lead: "입양 전 필요한 내용을 확인해 보세요.",
    },
  },
  "pet-knowledge": {
    slug: "pet-knowledge",
    title: "반려동물 상식 퀴즈",
    renderer: "adoption-readiness",
    questions: petKnowledgeQuestions,
    showSpeciesSelection: false,
    persistResult: false,
    shareable: false,
    metadata: {
      title: "반려동물 상식 퀴즈",
      description: "반려동물과 함께하기 전에 알아두면 좋은 내용을 확인해 보세요.",
    },
    intro: {
      badge: "상식 퀴즈",
      title: "반려동물과\n더 가까워지는 상식",
      lead: "함께 살기 전에 알아두면 좋은 것들만 골랐어요.\n가볍게 풀면서 반려동물 상식을 확인해 보세요.",
    },
  },
};

export function getQuizDefinition(slug: string) {
  return quizDefinitions[slug] ?? null;
}

export function getQuizSlugs() {
  return Object.keys(quizDefinitions);
}
