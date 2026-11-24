"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createQuickReplyAction,
  deleteQuickReplyAction,
  listQuickRepliesAction,
  updateQuickReplyAction,
} from "@/server/actions/quick-replies.actions";
import type { QuickReply, QuickReplyInput } from "@/lib/quick-replies";

const bySortShortcut = (a: QuickReply, b: QuickReply) => a.shortcut.localeCompare(b.shortcut);

/** Lista y CRUD de respuestas rápidas del chat. Cada operación devuelve el error (en español) o null. */
export function useQuickReplies() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listQuickRepliesAction().then((res) => {
      if (cancelled) return;
      if (res.success) setItems(res.data);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const create = useCallback(async (input: QuickReplyInput) => {
    const res = await createQuickReplyAction(input);
    if (!res.success) return res.error;
    setItems((prev) => [...prev, res.data].sort(bySortShortcut));
    return null;
  }, []);

  const update = useCallback(async (id: string, input: QuickReplyInput) => {
    const res = await updateQuickReplyAction(id, input);
    if (!res.success) return res.error;
    setItems((prev) => prev.map((r) => (r.id === id ? res.data : r)).sort(bySortShortcut));
    return null;
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await deleteQuickReplyAction(id);
    if (!res.success) return res.error;
    setItems((prev) => prev.filter((r) => r.id !== id));
    return null;
  }, []);

  return { items, loaded, create, update, remove };
}
