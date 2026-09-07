import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const suffix = params.size ? `?${params}` : "";
  await requireChatGPTUser(`/admin${suffix}`);
  // The existing console checks the member's server-side operating permissions.
  redirect(`/operations${suffix}`);
}
