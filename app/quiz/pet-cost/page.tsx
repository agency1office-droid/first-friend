import { redirect } from "next/navigation";

type PageProps = { searchParams: Promise<{ species?: string }> };

export default async function LegacyPetCostPage({ searchParams }: PageProps) {
  await searchParams;
  redirect("/");
}
