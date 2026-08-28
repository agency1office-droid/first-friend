import Image from "next/image";

export type SpeciesSelection = "cat" | "dog";

type SpeciesSelectionStepProps = {
  titleId: string;
  question: string;
  description?: string;
  groupLabel?: string;
  species: SpeciesSelection | null;
  onSpeciesChange: (species: SpeciesSelection) => void;
};

/**
 * The species step is intentionally shared by the readiness quiz and drawing
 * flow so the two entry points cannot drift apart visually or structurally.
 */
export function SpeciesSelectionStep({
  titleId,
  question,
  description,
  groupLabel = "입양을 준비하는 동물",
  species,
  onSpeciesChange,
}: SpeciesSelectionStepProps) {
  return (
    <section className="ff-readiness-species-page" aria-labelledby={titleId}>
      <h2
        id={titleId}
        dangerouslySetInnerHTML={{
          __html: `<span class="ff-readiness-question-label" aria-hidden="true">Q.</span> ${question}`,
        }}
      />
      <div className="ff-readiness-species-grid" role="group" aria-label={groupLabel}>
        <button
          type="button"
          className="ff-readiness-species-choice"
          data-selected={species === "cat" || undefined}
          aria-pressed={species === "cat"}
          onClick={() => onSpeciesChange("cat")}
        >
          <Image className="ff-readiness-species-image" src="/cat-selection.webp" alt="" aria-hidden="true" width={104} height={104} unoptimized />
          <strong>고양이</strong>
        </button>
        <button
          type="button"
          className="ff-readiness-species-choice"
          data-selected={species === "dog" || undefined}
          aria-pressed={species === "dog"}
          onClick={() => onSpeciesChange("dog")}
        >
          <Image className="ff-readiness-species-image" src="/dog-selection.webp" alt="" aria-hidden="true" width={104} height={104} unoptimized />
          <strong>강아지</strong>
        </button>
      </div>
      {description ? <p className="ff-readiness-species-description">{description}</p> : null}
    </section>
  );
}
