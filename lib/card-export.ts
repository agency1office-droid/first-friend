// 화면의 SVG 카드(인연 카드·인증서)를 그대로 PNG로 내보내는 공용 도구입니다. qrcode 같은 카드별 의존성은 여기 두지 않습니다.
// 이미지로 변환할 때는 CSS 변수와 외부 URL을 쓸 수 없어, 색은 SEED 라이트 팔레트 값으로 고정하고 그림은 data URL로 받아 둡니다.
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const COLOR = {
  night: "#1c2340", cream: "#fffaf3",
  ink: "#1a1c20", muted: "#555d6d", subtle: "#868b94", // SEED gray-1000 / gray-800 / gray-700
  brand: "#f60", brandWeak: "#fff2ec", // SEED carrot-600 / carrot-100
  positive: "#079171", positiveWeak: "#edfaf6", informative: "#217cf9", informativeWeak: "#eff6ff", neutralWeak: "#f7f8f9", // SEED green·blue 700/100, gray-100
  line: "#00000010", white: "#fff", // SEED static-black-alpha-300 / static-white
};
export const FONT = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", sans-serif`;

// 한글은 글자 폭이 글자 크기와 비슷해, 긴 이름은 글자 크기를 줄여 한 줄에 맞춥니다.
export function fitFontSize(text: string, maxSize: number, width: number) {
  return Math.min(maxSize, Math.floor(width / Math.max(text.length, 1)));
}

export function cardDate() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
}

export async function toDataUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`이미지를 받지 못했어요 (${response.status})`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했어요"));
    reader.readAsDataURL(blob);
  });
}

/** 화면의 카드 SVG를 그대로 1080×1350 PNG로 만듭니다. 글꼴은 기기 글꼴이라 화면과 같게 나옵니다. */
export async function exportCardPng(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(CARD_WIDTH));
  clone.setAttribute("height", String(CARD_HEIGHT));
  clone.removeAttribute("class");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("캔버스를 쓸 수 없어요");
    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG로 바꾸지 못했어요")), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
