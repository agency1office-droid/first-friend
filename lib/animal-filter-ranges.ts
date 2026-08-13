// Public animal API 기준으로 산정한 범위입니다.
// 나이: 가장 오래된 유효 등록값이 2009년생(현재 기준 약 17살)
// 체중: 이상값(예: 350kg)을 제외한 유효 등록값이 56kg까지 존재
export const PUBLIC_ANIMAL_AGE_MAX = 17;
export const PUBLIC_ANIMAL_WEIGHT_MAX = 60;

export const PUBLIC_ANIMAL_AGE_TICKS = [0, 5, 10, 15, 17] as const;
export const PUBLIC_ANIMAL_WEIGHT_TICKS = [0, 10, 20, 30, 40, 50, 60] as const;
