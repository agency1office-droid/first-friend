import type { Metadata } from "next";
import { encyclopedias } from "../../lib/care-content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { Callout } from "seed-design/ui/callout";
import { Badge } from "seed-design/ui/badge";
export const metadata: Metadata = { title: "개·고양이 함께살이 백과" };
export default function Page() {
  return (
    <div className="ff-page">
      <header className="ff-page-header">
        <div className="ff-kicker">좋은 점과 어려운 점을 함께</div>
        <h1 className="ff-title">
          함께 살기 전에
          <br />
          현실을 먼저 알아봐요
        </h1>
        <p className="ff-description">
          예쁜 모습만 보여주지 않아요. 공간, 시간, 소음, 배변, 비용까지 솔직하게
          안내합니다.
        </p>
      </header>
      <Callout
        tone="informative"
        description="품종보다 개체의 건강·성격·과거 환경 차이가 큽니다. 아래 내용은 입양 상담을 준비하는 일반 안내예요."
      />
      {Object.values(encyclopedias).map((item) => (
        <article className="ff-encyclopedia" key={item.label}>
          <div className="ff-section-head">
            <div>
              <Badge tone="positive" variant="weak">
                {item.label}
              </Badge>
              <h2>{item.headline}</h2>
            </div>
          </div>
          <dl>
            <div>
              <dt>얼마나 오래 함께하나요?</dt>
              <dd>{item.lifespan}</dd>
            </div>
            <div>
              <dt>얼마나 크게 자라나요?</dt>
              <dd>{item.size}</dd>
            </div>
            <div>
              <dt>집은 얼마나 넓어야 하나요?</dt>
              <dd>{item.space}</dd>
            </div>
          </dl>
          <Accordion
            multiple
            defaultValue={[`${item.label}-good`, `${item.label}-real`]}
          >
            <AccordionItem value={`${item.label}-good`}>
              <AccordionTrigger title="함께 살 때 좋은 점" />
              <AccordionContent>
                <ul>
                  {item.positives.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value={`${item.label}-real`}>
              <AccordionTrigger title="반드시 감수하고 준비할 점" />
              <AccordionContent>
                <ul>
                  {item.realities.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </article>
      ))}
    </div>
  );
}
