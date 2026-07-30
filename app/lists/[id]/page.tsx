import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListDetailView from "./list-detail-view";

export default async function ListDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <Link href="/lists" className="text-sm text-ink/50 hover:text-ink">
            ← Zpět na wishlisty
          </Link>
        </header>

        <ListDetailView listId={params.id} />
      </div>
    </main>
  );
}
