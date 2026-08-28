import { IconChevronLeftLine, IconHouseLine } from "@karrotmarket/react-monochrome-icon";

type ReadinessAppBarProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  className?: string;
};

/** Shared app bar for readiness-style selection screens. */
export function ReadinessAppBar({ title, onBack, backLabel = "이전으로", className = "" }: ReadinessAppBarProps) {
  return (
    <header className={`ff-readiness-appbar${className ? ` ${className}` : ""}`}>
      <button type="button" className="ff-readiness-back" onClick={onBack} aria-label={backLabel}>
        <IconChevronLeftLine aria-hidden />
      </button>
      <strong>{title}</strong>
      <div className="ff-readiness-header-actions">
        <button type="button" className="ff-readiness-home" onClick={() => window.location.assign("/")} aria-label="홈으로 이동">
          <IconHouseLine aria-hidden />
        </button>
      </div>
    </header>
  );
}
