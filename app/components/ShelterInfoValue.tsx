"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  IconChevronDownSmallLine,
  IconChevronUpSmallLine,
} from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { useAppFeedback } from "./AppFeedback";

export function ShelterInfoValue({ value, copyLabel }: { value: string; copyLabel?: string }) {
  const textRef = useRef<HTMLElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const feedback = useAppFeedback();

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;
    const checkOverflow = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, value]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      feedback.success(`${copyLabel}를 복사했어요`);
    } catch {
      feedback.error(`${copyLabel} 정보를 복사하지 못했어요`);
    }
  }

  return <div className="ff-shelter-info-value" data-expanded={expanded || undefined} data-copy={copyLabel || undefined}>
    <strong ref={textRef}>{value}</strong>
    <span className="ff-shelter-info-value-actions">
      {overflowing && <ActionButton type="button" size="small" layout="iconOnly" variant="ghost" onClick={() => setExpanded(current => !current)} aria-label={expanded ? `${value} 접기` : `${value} 펼쳐 보기`}>
        <Icon svg={expanded ? <IconChevronUpSmallLine/> : <IconChevronDownSmallLine/>}/>
      </ActionButton>}
      {copyLabel && <button type="button" className="ff-address-copy" onClick={copy} aria-label={`${copyLabel} ${value} 복사`}>복사</button>}
    </span>
  </div>;
}
