"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ListSummary } from "@/lib/lists";

export default function ListsView() {
  const supabase = createClient();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadLists = useCallback(async () => {
    const { data, error } = await supabase
      .from("lists_with_counts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLists(data as ListSummary[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("lists")
        .insert({ owner_id: user.id, name: newName.trim() });

      if (!error) {
        setNewName("");
        await loadLists();
      }
    }
    setCreating(false);
  }

  return (
    <div>
      <form onSubmit={createList} className="mb-8 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Název nového seznamu, např. Léto v Alpách"
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-moss"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-moss-light disabled:opacity-60"
        >
          {creating ? "Vytvářím…" : "Vytvořit"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink/40">Načítám…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-ink/50">
          Zatím nemáš žádný seznam. Vytvoř první nahoře, nebo přidej místo do seznamu přímo z mapy.
        </p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-white/60 px-5 py-4 transition hover:bg-white"
            >
              <div>
                <p className="font-medium text-ink">{list.name}</p>
                <p className="text-sm text-ink/50">
                  {list.item_count} {list.item_count === 1 ? "místo" : "míst"}
                </p>
              </div>
              <span className="text-ink/30">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
