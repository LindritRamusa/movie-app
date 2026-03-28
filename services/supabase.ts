import { getPasswordRecoveryRedirectUrl } from "@/constants/appLinks";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_MOVIE_SEARCHES_TABLE,
  SUPABASE_URL,
} from "@/constants/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface MovieSearchRow {
  search_term: string;
  movie_id: number;
  title: string;
  count: number;
  poster_url: string;
}

const rowToTrending = (row: MovieSearchRow): TrendingMovie => ({
  searchTerm: row.search_term,
  movie_id: row.movie_id,
  title: row.title,
  count: row.count,
  poster_url: row.poster_url,
});

export const updateSearchCount = async (query: string, movie: Movie) => {
  const table = SUPABASE_MOVIE_SEARCHES_TABLE;
  const term = query.trim();
  if (!term) {
    return;
  }

  const { data: existing, error: selErr } = await supabase
    .from(table)
    .select("search_term, movie_id, title, count, poster_url")
    .eq("search_term", term)
    .maybeSingle();

  if (selErr) {
    return;
  }

  const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

  if (existing) {
    await supabase
      .from(table)
      .update({
        count: (existing as MovieSearchRow).count + 1,
        movie_id: movie.id,
        title: movie.title,
        poster_url: posterUrl,
      })
      .eq("search_term", term);
    return;
  }

  await supabase.from(table).insert({
    search_term: term,
    movie_id: movie.id,
    title: movie.title,
    count: 1,
    poster_url: posterUrl,
  });
};

export const getTrendingMovies = async (): Promise<TrendingMovie[]> => {
  const { data, error } = await supabase
    .from(SUPABASE_MOVIE_SEARCHES_TABLE)
    .select("search_term, movie_id, title, count, poster_url")
    .order("count", { ascending: false })
    .limit(5);

  if (error || !data) {
    return [];
  }

  return (data as MovieSearchRow[]).map(rowToTrending);
};

export const requestPasswordRecovery = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: getPasswordRecoveryRedirectUrl() }
  );
  if (error) {
    throw error;
  }
};

export const applyRecoverySession = async (
  accessToken: string,
  refreshToken: string
): Promise<void> => {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw error;
  }
};

export const updatePasswordWithRecoverySession = async (
  newPassword: string
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
};
