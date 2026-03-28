import { updateSearchCount } from "@/services/supabase";
import { useEffect, useRef } from "react";

export const useSearchCountUpdate = (
  searchQuery: string,
  movies: Movie[] | null | undefined,
  loading: boolean
) => {
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !searchQuery.trim() || !movies?.length || !movies[0]) {
      return;
    }

    const key = `${searchQuery.trim().toLowerCase()}:${movies[0].id}`;
    if (lastSyncedKeyRef.current === key) {
      return;
    }
    lastSyncedKeyRef.current = key;

    void updateSearchCount(searchQuery.trim(), movies[0]).catch(() => {});
  }, [loading, searchQuery, movies]);
};
