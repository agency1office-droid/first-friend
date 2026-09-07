"use client";

import { Callout } from "seed-design/ui/callout";
import { ActionButton } from "seed-design/ui/action-button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="ff-page"><Callout tone="warning" title="화면을 불러오지 못했어요" description="연결이 잠시 끊겼을 수 있어요. 잠시 후 다시 시도해 주세요."/><ActionButton onClick={reset}>다시 시도</ActionButton></div>;
}
