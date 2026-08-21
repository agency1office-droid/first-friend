import { redirect } from "next/navigation";

type PageProps = { searchParams: Promise<{ species?: string }> };

export default async function LegacyPetCostPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const species = query.species === "dog" ? "?species=dog" : "?species=cat";
  redirect(`/pet-cost-calculator${species}`);
}
