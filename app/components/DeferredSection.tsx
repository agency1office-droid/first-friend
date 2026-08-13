"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 화면 근처에 도달했을 때만 무거운 부가 영역을 마운트합니다. */
export function DeferredSection({ children, minHeight = 72 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      const timer = globalThis.setTimeout(() => setVisible(true), 0);
      return () => globalThis.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} style={visible ? undefined : { minHeight }} aria-busy={!visible}>
    {visible ? children : null}
  </div>;
}
