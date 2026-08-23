import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";

export type InfoBoardItem = { id: string; title: ReactNode; content: ReactNode; prefix?: ReactNode };

// Toss Board Row의 정보 밀도와 Q&A 구조를 SEED Accordion 토큰·접근성 위에 재해석한 컴포넌트입니다.
export function InfoBoard({ items, defaultOpen = [], showPrefix = true }: { items: InfoBoardItem[]; defaultOpen?: string[]; showPrefix?: boolean }) {
  return <div className={`ff-info-board${showPrefix ? "" : " ff-info-board--plain"}`}><Accordion multiple defaultValue={defaultOpen}>{items.map((item, index) => <AccordionItem value={item.id} key={item.id}><AccordionTrigger headingLevel={3} title={item.title} prefix={showPrefix ? <span className="ff-info-board-prefix">{item.prefix ?? (index + 1)}</span> : undefined}/><AccordionContent><div className="ff-info-board-content">{item.content}</div></AccordionContent></AccordionItem>)}</Accordion></div>;
}
