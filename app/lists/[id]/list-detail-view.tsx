"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLACE_TYPE_META } from "@/lib/places";
import type { ListItem } from "@/lib/lists";

interface ListInfo {
  id: string;
  name: string;
  is_public: boolean;
}

export default function ListDetailView({ listId }: { listId: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [list, setList] = useState<ListInfo | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [{ data: listData, error: listError }, { data: itemsData }] = await Promise.all([
      supabase.from("lists").select("id, name, is_public").eq("id", listId).single(),
      supabase
        .from("list_items_with_places")
        .select("*")
        .eq("list_id", listId)
        .order("added_at", { ascending: false }),
    ]);

    if (listError || !listData) {
      setNotFound(true);
    } else {
      setList(listData as ListInfo);
      setNameDraft((listData as ListInfo).name);
    }

    if (itemsData) {
      setItems(itemsData as ListItem[]);
    }
    setLoading(false);
  }, [listId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveName() {
    if (!nameDraft.trim() || !list) return;
    const { error } = await supabase
      .from("lists")
      .update({ name: nameDraft.trim() })
      .eq("id", list.id);
    if (!error) {
      setList({ ...list, name: nameDraft.trim() });
      setRenaming(false);
    }
  }

  async function removeItem(placeId: string) {
    await supabase.from("list_items").delete().eq("list_id", listId).eq("place_id", placeId);
    setItems((prev) => prev.filter((i) => i.place_id !== placeId));
  }

  async function deleteList() {
    if (!confirm("Smazat celý seznam? Tuhle akci nejde vrátit zpět.")) return;
    await supabase.from("lists").delete().eq("id", listId);
    router.push("/lists");
  }

  if (loading) {
    return <p className="text-sm text-ink/40">Načítám…</p>;
  }

  if (notFound || !list) {
    return <p className="text-sm text-ink/50">Tenhle seznam neexistuje nebo k němu nemáš přístup.</p>;
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        {renaming ? (
          <div className="flex flex-1 gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-2xl font-semibold text-ink"
              autoFocus
            />
            <button
              onClick={saveName}
              className="rounded-lg bg-moss px-3 py-2 text-sm font-medium text-paper hover:bg-moss-light"
            >
              Uložit
            </button>
          </div>
        ) : (
          <h1
            onClick={() => setRenaming(true)}
            className="cursor-pointer text-4xl font-semibold text-ink"
            title="Klikni pro přejmenování"
          >
            {list.name}
          </h1>
        )}
        <button
          onClick={deleteList}
          className="ml-4 shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm text-ink/50 transition hover:bg-white/60 hover:text-gold"
        >
          Smazat seznam
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink/50">
          Zatím prázdné. Otevři mapu, klikni na místo a přidej ho do tohoto seznamu.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = PLACE_TYPE_META[item.type];
            return (
              <div
                key={item.place_id}
                className="flex items-start justify-between rounded-xl border border-line bg-white/60 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className={`text-xs ${meta.color}`}>
                    {meta.label}
                    {item.source === "osm" && " · OpenStreetMap"}
                  </p>
                  {item.note && <p className="mt-1 text-sm text-ink/60">{item.note}</p>}
                  <p className="mt-1 font-mono text-xs text-ink/30">
                    {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.place_id)}
                  className="ml-4 shrink-0 text-ink/30 transition hover:text-gold"
                  aria-label="Odebrat ze seznamu"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
