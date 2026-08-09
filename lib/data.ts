export type Animal = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  ageGroup: "어린 친구" | "어른 친구";
  sex: string;
  region: string;
  shelter: string;
  source: string;
  updated: string;
  image: string;
  colors: string[];
  traits: string[];
  summary: string;
  health: string[];
  life: string[];
  matchReason: string;
};

export const animals: Animal[] = [
  {
    id: "bomi", name: "보미", species: "고양이", breed: "코리안숏헤어", age: "3살 추정", ageGroup: "어른 친구", sex: "여아", region: "서울 마포구", shelter: "햇살 보호소", source: "인증 보호소", updated: "2026. 8. 8.",
    image: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85", colors: ["치즈", "흰색"], traits: ["조용해요", "사람을 좋아해요", "창가를 좋아해요"], summary: "천천히 다가오지만 마음을 열면 곁을 오래 지켜주는 고양이예요.", health: ["종합백신 3차 완료", "중성화 완료", "2026년 7월 기본검진 완료"], life: ["화장실 사용 양호", "다른 고양이와 합사 관찰 필요", "하루 6시간 정도 혼자 지낼 수 있어요"], matchReason: "따뜻한 치즈빛 털과 둥근 얼굴, 흰 가슴 무늬가 닮았어요."
  },
  {
    id: "dubu", name: "두부", species: "강아지", breed: "믹스견", age: "5살 추정", ageGroup: "어른 친구", sex: "남아", region: "부산 수영구", shelter: "바다 임시보호", source: "개인 임시보호", updated: "2026. 8. 7.",
    image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=85", colors: ["크림", "갈색"], traits: ["산책을 좋아해요", "낯가림이 있어요", "차분해요"], summary: "산책할 때 가장 환하게 웃는, 느긋하고 다정한 친구예요.", health: ["광견병 예방접종 완료", "중성화 완료", "슬개골 정기 관찰 중"], life: ["하루 2회 산책 권장", "어린아이와는 천천히 만나야 해요", "차량 이동 가능"], matchReason: "크림색 털과 접힌 귀, 부드럽게 웃는 입매가 닮았어요."
  },
  {
    id: "toto", name: "토토", species: "고양이", breed: "코리안숏헤어", age: "8개월 추정", ageGroup: "어린 친구", sex: "남아", region: "대전 유성구", shelter: "유성 동물보호센터", source: "공공 데이터", updated: "2026. 8. 9.",
    image: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=85", colors: ["고등어", "흰색"], traits: ["호기심이 많아요", "장난감을 좋아해요", "활발해요"], summary: "새 장난감을 보면 누구보다 먼저 달려오는 씩씩한 막내예요.", health: ["1차 접종 완료", "중성화 예정", "구조 당시 피부 치료 완료"], life: ["놀이 시간 하루 30분 이상 권장", "고양이 친구와 잘 지내요", "방묘창이 필요해요"], matchReason: "선명한 줄무늬와 큰 귀, 반짝이는 눈의 인상이 닮았어요."
  },
  {
    id: "maru", name: "마루", species: "강아지", breed: "믹스견", age: "7살 추정", ageGroup: "어른 친구", sex: "여아", region: "제주 제주시", shelter: "곶자왈 쉼터", source: "인증 보호소", updated: "2026. 8. 6.",
    image: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=85", colors: ["검정", "탄"], traits: ["충성스러워요", "산책 매너가 좋아요", "조용해요"], summary: "서두르지 않는 가족과 평온한 하루를 보내고 싶은 어른 강아지예요.", health: ["종합백신 완료", "중성화 완료", "치아 스케일링 상담 권장"], life: ["짧은 산책을 좋아해요", "계단보다 엘리베이터가 좋아요", "혼자 있는 시간은 5시간 이내 권장"], matchReason: "검은 털 위 갈색 눈썹 무늬와 반듯한 귀 모양이 닮았어요."
  },
];

export const stories = [
  { id: 1, category: "입양 일기", title: "보리와 맞는 첫 번째 여름", body: "낯선 집 구석에서 나오지 않던 보리가 이제는 선풍기 앞 명당을 먼저 차지해요.", author: "보리네", image: animals[0].image, reactions: 184 },
  { id: 2, category: "보호 이야기", title: "천천히 가까워지는 시간", body: "손길을 피하던 별이가 오늘 처음으로 간식 앞에서 눈을 맞춰주었습니다.", author: "햇살 보호소", image: animals[2].image, reactions: 143 },
  { id: 3, category: "오늘의 추억", title: "비 온 뒤의 짧은 산책", body: "젖은 흙 냄새를 맡으며 평소보다 느리게, 오래 걸었던 저녁입니다.", author: "마루 언니", image: animals[3].image, reactions: 98 },
  { id: 4, category: "동네 친구", title: "도서관 뒤 삼색이의 안부", body: "정확한 장소는 숨길게요. 오늘도 안전한 곳에서 느긋하게 쉬고 있었어요.", author: "초록 우산", image: animals[1].image, reactions: 76 },
  { id: 5, category: "입양 일기", title: "가족사진을 다시 찍은 날", body: "한 번도 카메라를 보지 않던 두부가 오늘은 가운데서 가장 환하게 웃었습니다.", author: "두부네", image: animals[1].image, reactions: 61 },
];

export function animalById(id: string) {
  return animals.find((animal) => animal.id === id);
}
