export type CostItem = { name: string; cadence: "처음" | "매달" | "매년" | "비상"; low: number; high: number; note: string };

export const catCosts: CostItem[] = [
  { name: "이동장·화장실·식기", cadence: "처음", low: 90000, high: 260000, note: "안전한 이동장과 몸길이 1.5배 이상 화장실을 우선해요." },
  { name: "방묘창·스크래처·숨숨집", cadence: "처음", low: 100000, high: 450000, note: "추락·탈출 방지가 장난감보다 먼저예요." },
  { name: "사료", cadence: "매달", low: 30000, high: 90000, note: "체중·질환·처방식 여부에 따라 달라져요." },
  { name: "고양이 모래", cadence: "매달", low: 25000, high: 70000, note: "화장실 수와 선호 모래에 따라 달라져요." },
  { name: "간식·소모품", cadence: "매달", low: 10000, high: 40000, note: "필수품은 아니며 주식 균형을 먼저 확인해요." },
  { name: "예방접종·건강검진", cadence: "매년", low: 100000, high: 350000, note: "지역·병원·검사 범위에 따른 준비 범위예요." },
  { name: "중성화", cadence: "처음", low: 150000, high: 500000, note: "성별·체중·검사·입원 여부에 따라 달라져요." },
  { name: "응급 진료 대비금", cadence: "비상", low: 1000000, high: 3000000, note: "진료비 예측이 아니라 즉시 쓸 수 있는 권장 예비자금이에요." },
];

export const dogCosts: CostItem[] = [
  { name: "이동장·하네스·식기·안전문", cadence: "처음", low: 120000, high: 400000, note: "목줄만 쓰지 말고 체형에 맞는 하네스를 준비해요." },
  { name: "배변패드·배변용품", cadence: "매달", low: 15000, high: 60000, note: "실외 배변만 강요하지 않고 비상 실내 배변도 대비해요." },
  { name: "사료", cadence: "매달", low: 40000, high: 160000, note: "체급과 활동량, 처방식 여부에 따라 달라져요." },
  { name: "심장사상충·외부기생충 예방", cadence: "매달", low: 15000, high: 50000, note: "투약 주기와 체중은 수의사와 확인해요." },
  { name: "미용·발톱·귀 관리", cadence: "매달", low: 0, high: 120000, note: "견종과 직접 관리 가능 여부에 따라 차이가 커요." },
  { name: "예방접종·건강검진", cadence: "매년", low: 150000, high: 450000, note: "지역·병원·검사 범위에 따른 준비 범위예요." },
  { name: "중성화", cadence: "처음", low: 200000, high: 700000, note: "성별·체중·검사·입원 여부에 따라 달라져요." },
  { name: "응급 진료 대비금", cadence: "비상", low: 1000000, high: 3500000, note: "대형견·수술·입원이 필요한 경우 더 커질 수 있어요." },
];

export const encyclopedias = {
  cat: {
    label: "고양이", headline: "조용해 보여도 환경을 입체적으로 써요", lifespan: "평균 12~18년, 20년 이상 함께하는 경우도 있어요", size: "대부분 3~6kg, 대형 품종은 8kg 이상 자랄 수 있어요",
    space: "평수만으로 적합성을 판단하지 않아요. 원룸도 수직 공간·분리 휴식처·화장실·놀이 동선을 확보하면 가능하지만, 최소 두 개의 분리된 휴식 구역을 권해요.",
    positives: ["실내 생활에 잘 적응하는 개체가 많아요", "규칙적인 놀이와 안정된 환경에서 깊은 유대를 만들어요", "산책이 필수는 아니지만 매일 사냥놀이가 필요해요"],
    realities: ["벽지·소파를 긁을 수 있어요. 스크래처 위치와 재질을 여러 번 조정해야 해요", "스트레스·질병·화장실 불만으로 다른 곳에 배변할 수 있어요", "새벽 활동, 털 날림, 구토, 모래 먼지와 냄새를 감수해야 해요", "창문·현관 탈출과 끈·백합 등 중독 위험을 집 전체에서 관리해야 해요"],
  },
  dog: {
    label: "강아지", headline: "매일의 시간과 바깥 활동을 함께 약속해야 해요", lifespan: "평균 10~16년, 체급·건강에 따라 달라요", size: "성견 체중은 2kg대부터 40kg 이상까지 품종·부모견에 따라 크게 달라요",
    space: "집 평수보다 매일의 산책·놀이·휴식 분리와 소음 관리가 중요해요. 대형견이나 활동량이 높은 개체는 넓은 이동 동선과 더 긴 야외 활동이 필요해요.",
    positives: ["함께 걷고 배우며 일상 리듬을 나누기 좋아요", "사회적 교류를 즐기는 개체가 많아요", "교육과 놀이를 통해 가족과 다양한 활동을 할 수 있어요"],
    realities: ["비·눈·폭염에도 배변과 산책 계획이 필요해요", "짖음·분리불안·물어뜯기·배변 실수가 이웃 갈등으로 이어질 수 있어요", "여행·장시간 외출 때 믿을 돌봄 대안이 꼭 필요해요", "크기와 힘에 맞는 사회화·안전 교육을 꾸준히 해야 해요"],
  },
};

export const tnrRegions = [
  { region: "서울특별시", office: "각 자치구 동물보호 담당 부서", season: "통상 봄·가을 집중, 자치구별 공고 확인", route: "120 또는 자치구 홈페이지에서 길고양이 TNR 접수" },
  { region: "경기도", office: "시·군 축산·동물보호 담당 부서", season: "시·군별 사업 기간 상이", route: "관할 시·군 콜센터에서 접수 기관과 협력 병원 확인" },
  { region: "부산광역시", office: "구·군 동물보호 담당 부서", season: "예산·기온에 따라 운영", route: "120 또는 구·군청 동물보호 사업 안내 확인" },
  { region: "그 외 지역", office: "시·군·구 동물보호 담당 부서", season: "지역 공고에 따라 운영", route: "국가동물보호정보시스템과 지자체 대표번호에서 공식 절차 확인" },
];

export const seedCoverage = [
  "Accordion", "Action Button", "Alert/Dialog", "Attachment Input", "Avatar", "Badge", "Bottom Navigation", "Bottom Sheet", "Callout", "Checkbox", "Chip", "Content Placeholder", "Contextual/Floating Button", "Divider", "Field", "Footer", "Help Bubble", "Image Frame", "List", "Menu", "Notification Badge", "Page Banner", "Progress Circle", "Quantity Picker", "Radio", "Reaction Button", "Result Section", "Scroll Fog", "Segmented Control", "Select", "Side Panel", "Skeleton", "Slider", "Snackbar", "Switch", "Tabs", "Tag Group", "Text Input/Textarea", "Time Picker", "Top Navigation",
];
