export type ReadinessShareResult = { correct: number; total: number };

export function createReadinessSharePath(correct: number, total: number) {
  return `/quiz/adoption-prep/share/${Math.max(0, Math.min(correct, total))}-${Math.max(1, total)}`;
}

export function parseReadinessShareResult(value: string): ReadinessShareResult | null {
  const match = /^(\d+)-(\d+)$/.exec(value);
  if (!match) return null;
  const correct = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isSafeInteger(correct) || !Number.isSafeInteger(total) || total < 1 || correct < 0 || correct > total || total > 100) return null;
  return { correct, total };
}

export function getReadinessShareContent({ correct, total }: ReadinessShareResult) {
  const passingCount = Math.ceil(total * 0.8);
  const passed = correct >= passingCount;
  const perfect = correct === total;
  return {
    title: perfect ? "🎉 정답을 모두 맞혔어요!" : `${total}문제 중 ${correct}문제 정답이에요`,
    praise: perfect ? "완벽한 반려인" : passed ? "든든한 반려인" : "배워가는 반려인",
    description: perfect ? "입양 전 준비를 완벽하게 마쳤어요." : passed ? "반려동물 친구를 맞이할 준비를 든든하게 확인했어요." : "틀린 문제를 다시 살펴보며 천천히 준비해 보세요.",
  };
}
