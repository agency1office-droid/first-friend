export type VisualAnalysis = {
  source: "drawing" | "photo";
  species: "고양이" | "강아지" | "전체";
  speciesConfidence: number;
  colors: string[];
  size: "작은 체형" | "중간 체형" | "큰 체형";
  eyes: "작은 눈" | "보통 눈" | "큰 눈";
  fur: "짧은 털" | "중간 털" | "긴 털";
  pattern: "단색" | "줄무늬" | "여러 색";
  breedHints: string[];
  modelLabels: string[];
  tags: string[];
  usedOpenSourceModel: boolean;
};

type ClipPrediction = { className: string; probability: number };
type MobileClipModel = {
  classify(source: HTMLCanvasElement | HTMLImageElement, topK?: number): Promise<{ className: string; probability: number }[]>;
};

const mobileClipModelId = "plhery/mobileclip2-onnx";
const mobileClipLabels = ["a dog", "a cat", "a small dog", "a large dog", "a small cat", "a large cat"];
let modelPromise: Promise<MobileClipModel | null> | null = null;

async function createMobileClip(device: "webgpu" | "wasm") {
  const transformers = await import("@huggingface/transformers");
  const options = { device, dtype: "fp32" as const, model_file_name: "onnx/s0/vision_model" };
  const [tokenizer, processor, textModel, visionModel] = await Promise.all([
    transformers.AutoTokenizer.from_pretrained(mobileClipModelId),
    transformers.AutoProcessor.from_pretrained(mobileClipModelId, { config_file_name: "onnx/s0/preprocessor_config.json" }),
    transformers.CLIPTextModelWithProjection.from_pretrained(mobileClipModelId, { ...options, model_file_name: "onnx/s0/text_model" }),
    transformers.CLIPVisionModelWithProjection.from_pretrained(mobileClipModelId, options),
  ]);
  const textInputs = tokenizer(mobileClipLabels, { padding: "max_length", truncation: true });
  const textOutput = await textModel(textInputs);
  const textEmbeddings = textOutput.text_embeds.normalize(2, -1).tolist() as number[][];
  return {
    async classify(source: HTMLCanvasElement | HTMLImageElement) {
      const image = source instanceof HTMLCanvasElement ? transformers.RawImage.fromCanvas(source) : await transformers.RawImage.read(source.src);
      const imageInputs = await processor(image);
      const imageOutput = await visionModel(imageInputs);
      const imageEmbedding = (imageOutput.image_embeds.normalize(2, -1).tolist() as number[][])[0];
      const scores = textEmbeddings.map((embedding) => embedding.reduce((sum, value, index) => sum + value * (imageEmbedding[index] || 0), 0));
      const max = Math.max(...scores);
      const probabilities = scores.map((score) => Math.exp((score - max) * 12));
      const total = probabilities.reduce((sum, value) => sum + value, 0) || 1;
      return mobileClipLabels.map((className, index) => ({ className, probability: probabilities[index] / total })).sort((a, b) => b.probability - a.probability) as ClipPrediction[];
    },
  } satisfies MobileClipModel;
}

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        if (typeof navigator !== "undefined" && "gpu" in navigator) return await createMobileClip("webgpu");
      } catch { /* Fall back to WASM on devices without usable WebGPU support. */ }
      try {
        return await createMobileClip("wasm");
      } catch {
        return null;
      }
    })();
  }
  return modelPromise;
}

/** Starts loading MobileCLIP without blocking the drawing UI. */
export function preloadVisualModel() {
  void loadModel();
}

const swatches = [
  ["검정", 35, 35, 35], ["흰색", 238, 238, 235], ["회색", 135, 135, 135],
  ["갈색", 132, 86, 50], ["치즈", 225, 145, 42], ["크림", 226, 208, 168],
] as const;

function nearestColor(r: number, g: number, b: number) {
  return swatches.reduce((best, item) => {
    const distance = (r - item[1]) ** 2 + (g - item[2]) ** 2 + (b - item[3]) ** 2;
    return distance < best.distance ? { name: item[0], distance } : best;
  }, { name: "회색", distance: Infinity });
}

function modelHints(predictions: { className: string; probability: number }[]) {
  const text = predictions.map((item) => item.className.toLowerCase()).join(" ");
  const cat = /cat|tabby|persian|siamese|egyptian|lynx/.test(text);
  const dog = /dog|retriever|terrier|spaniel|hound|poodle|corgi|chihuahua|pomeranian|shepherd|collie|malamute|husky|shih|schnauzer|pinscher/.test(text);
  const breeds: string[] = [];
  const map: [RegExp, string][] = [[/persian/,"페르시안"],[/siamese/,"샴"],[/tabby|egyptian cat/,"한국 고양이"],[/retriever/,"리트리버"],[/poodle/,"푸들"],[/corgi/,"웰시 코기"],[/pomeranian/,"포메라니안"],[/chihuahua/,"치와와"],[/husky|malamute/,"허스키"],[/terrier/,"테리어"],[/shih/,"시추"]];
  for (const [pattern, label] of map) if (pattern.test(text) && !breeds.includes(label)) breeds.push(label);
  const top = predictions[0];
  return { species: cat && !dog ? "고양이" as const : dog && !cat ? "강아지" as const : "전체" as const, confidence: top ? Math.round(top.probability * 100) : 0, breeds };
}

async function classify(source: HTMLCanvasElement | HTMLImageElement) {
  try {
    const model = await Promise.race([
      loadModel(),
      new Promise<MobileClipModel | null>((resolve) => window.setTimeout(() => resolve(null), 1200)),
    ]);
    if (!model) return [];
    // 모델이 이미 준비된 경우에만 즉시 분류하고, 첫 다운로드 중에는
    // 휴리스틱 분석 결과를 먼저 사용합니다.
    const predictions = await Promise.race([
      model.classify(source, 5),
      new Promise<ClipPrediction[]>((resolve) => window.setTimeout(() => resolve([]), 1200)),
    ]);
    return predictions;
  } catch { return []; }
}

export async function analyzeVisual(source: HTMLCanvasElement | HTMLImageElement, isDrawing: boolean, preferredSpecies: "none" | "강아지" | "고양이" = "none"): Promise<VisualAnalysis> {
  const sample = document.createElement("canvas"); sample.width = 224; sample.height = 224;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지를 분석할 수 없습니다.");
  context.fillStyle = "#fff"; context.fillRect(0, 0, 224, 224); context.drawImage(source, 0, 0, 224, 224);
  const { data } = context.getImageData(0, 0, 224, 224);
  const counts = new Map<string, number>(); let minX = 224, minY = 224, maxX = 0, maxY = 0, active = 0, edges = 0;
  const gray = new Uint8Array(224 * 224), mask = new Uint8Array(224 * 224);
  for (let y=0;y<224;y++) for (let x=0;x<224;x++) { const p=(y*224+x)*4, r=data[p],g=data[p+1],b=data[p+2], brightness=(r+g+b)/3; gray[y*224+x]=brightness; const foreground=!isDrawing || Math.abs(255-r)+Math.abs(255-g)+Math.abs(255-b)>55; if (!foreground) continue; active++; mask[y*224+x]=1; minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);const nearest=nearestColor(r,g,b); if (nearest.distance <= 70 ** 2) counts.set(nearest.name,(counts.get(nearest.name)||0)+1); }
  for (let y=1;y<223;y++) for (let x=1;x<223;x++) { const i=y*224+x; if (mask[i] && Math.abs(gray[i]-gray[i-1])+Math.abs(gray[i]-gray[i-224])>75) edges++; }
  const boxArea=Math.max(1,(maxX-minX+1)*(maxY-minY+1)), fillRatio=active/(224*224), edgeRatio=edges/Math.max(1,active);
  // 색상 가장자리의 반투명 혼합 픽셀은 별도 색으로 세지 않습니다.
  // 실제로 칠한 색으로 볼 수 있는 면적만 남겨 검정·흰색 그림이 잡색으로 늘어나는 것을 막습니다.
  const detectedColors=[...counts.entries()].sort((a,b)=>b[1]-a[1]).filter(([,value])=>value>=Math.max(12,active*.05)).map(([name])=>name);
  // Drawing outlines are usually black, so ignore black when the canvas also has a filled color.
  // Keep it when it is the only detected color because an all-black drawing is still meaningful.
  const colors=isDrawing && detectedColors.length>1 ? detectedColors.filter((name)=>name!=="검정") : detectedColors;
  const size=fillRatio<.22?"작은 체형":fillRatio>.58?"큰 체형":"중간 체형";
  const fur=edgeRatio>.32?"긴 털":edgeRatio>.18?"중간 털":"짧은 털";
  const pattern=colors.length>=3?"여러 색":edgeRatio>.24?"줄무늬":"단색";
  // 눈 크기는 그림의 얼굴 상단부에 있는 어두운 픽셀 덩어리 비율을 사용한 설명 가능한 휴리스틱입니다.
  let upperDark=0; for(let y=minY;y<Math.min(maxY,minY+(maxY-minY)*.6);y++) for(let x=minX;x<=maxX;x++){const i=y*224+x;if(mask[i]&&gray[i]<80)upperDark++;}
  const eyeRatio=upperDark/boxArea, eyes=eyeRatio>.035?"큰 눈":eyeRatio<.009?"작은 눈":"보통 눈";
  const predictions=await classify(source), hints=modelHints(predictions);
  const species=isDrawing && preferredSpecies !== "none" ? preferredSpecies : hints.species;
  // 손그림은 칠한 대표 색상과 선택된 종만 확실한 검색 단서로 사용합니다.
  // 눈·털 길이·체형은 그림의 선 굵기와 캔버스 비율에 크게 좌우되므로 태그에서 제외합니다.
  const tags=isDrawing
    ? [species !== "전체" ? `종류: ${species}` : "종류: 판별 어려움", hints.breeds.length ? `품종: ${hints.breeds.join(" · ")}` : "품종: 판별 어려움", colors.length ? `털색: ${colors.join(" · ")}` : "털색: 판별 어려움", `무늬: ${pattern}`, `형태: ${size}`]
    : [species,...colors,size,eyes,fur,pattern,...hints.breeds].filter((value,index,array)=>value!=="전체"&&array.indexOf(value)===index);
  return { source:isDrawing ? "drawing" : "photo", species,speciesConfidence:hints.confidence,colors:colors.length ? colors : isDrawing ? [] : ["회색"],size,eyes,fur,pattern,breedHints:isDrawing ? [] : hints.breeds,modelLabels:predictions.map(item=>item.className),tags,usedOpenSourceModel:predictions.length>0 };
}

export function animalVisualTags(animal: { breed:string; colors:string[]; traits:string[] }) {
  const text=`${animal.breed} ${animal.traits.join(" ")}`.toLowerCase(); const tags=[...animal.colors];
  const weight=Number(text.match(/([\d.]+)\s*kg/)?.[1]); tags.push(weight ? weight<6?"작은 체형":weight>18?"큰 체형":"중간 체형" : "중간 체형");
  if (/페르시안|메인쿤|장모|포메라니안|말라뮤트|허스키/.test(text)) tags.push("긴 털"); else if (/숏헤어|단모|푸들|믹스/.test(text)) tags.push("짧은 털");
  if (/페르시안|브리티시|엑조틱|포메라니안/.test(text)) tags.push("큰 눈");
  if (/태비|고등어|줄무늬/.test(text)) tags.push("줄무늬");
  return tags;
}
