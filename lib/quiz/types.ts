export type QuizRenderer = "adoption-readiness";

export type QuizQuestion = {
  chapter: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type QuizDefinition = {
  slug: string;
  title: string;
  renderer: QuizRenderer;
  questions?: QuizQuestion[];
  showSpeciesSelection?: boolean;
  persistResult?: boolean;
  shareable?: boolean;
  metadata: {
    title: string;
    description: string;
  };
  intro: {
    badge: string;
    title: string;
    lead: string;
  };
};
