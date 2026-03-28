import { useAuth } from "@/store/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";

const LEGACY_STORAGE_KEY = "@movie_app_saved_movies";

const storageKeyForUser = (userId: string) =>
  `@movie_app_saved_movies_${userId}`;

const openAuthPath = (path: "/login" | "/register") => {
  const url = Linking.createURL(path);
  void Linking.openURL(url);
};

interface SavedMoviesContextValue {
  savedMovies: Movie[];
  isHydrated: boolean;
  isGuest: boolean;
  toggleMovie: (movie: Movie | MovieDetails) => void;
  isMovieSaved: (movieId: number) => boolean;
}

const SavedMoviesContext = createContext<SavedMoviesContextValue | null>(
  null
);

const toPersistableMovie = (input: Movie | MovieDetails): Movie => {
  if ("genre_ids" in input && Array.isArray(input.genre_ids)) {
    return input;
  }
  const d = input as MovieDetails;
  return {
    id: d.id,
    title: d.title,
    poster_path: d.poster_path ?? "",
    vote_average: d.vote_average,
    vote_count: d.vote_count,
    release_date: d.release_date,
    overview: d.overview ?? "",
    adult: d.adult,
    backdrop_path: d.backdrop_path ?? "",
    genre_ids: d.genres?.map((g) => g.id) ?? [],
    original_language: d.original_language,
    original_title: d.original_title,
    popularity: d.popularity,
    video: d.video,
  };
};

export const SavedMoviesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady: isAuthReady } = useAuth();

  const [savedMovies, setSavedMovies] = useState<Movie[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const userId = user?.$id ?? null;
  const isGuest = !user;

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let cancelled = false;
    setIsHydrated(false);
    setSavedMovies([]);

    const load = async () => {
      if (!userId) {
        if (!cancelled) {
          setIsHydrated(true);
        }
        return;
      }

      try {
        const key = storageKeyForUser(userId);
        let raw = await AsyncStorage.getItem(key);

        if (!raw) {
          const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            raw = legacy;
            await AsyncStorage.setItem(key, legacy);
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        }

        if (cancelled) {
          return;
        }

        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setSavedMovies(parsed as Movie[]);
          }
        }
      } catch {} finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, userId]);

  useEffect(() => {
    if (!isHydrated || !userId) {
      return;
    }
    void AsyncStorage.setItem(
      storageKeyForUser(userId),
      JSON.stringify(savedMovies)
    );
  }, [savedMovies, isHydrated, userId]);

  const toggleMovie = useCallback(
    (movie: Movie | MovieDetails) => {
      if (!user) {
        Alert.alert(
          "Sign in to save movies",
          "Saved lists are stored per account. Create an account or sign in to save movies.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Sign in", onPress: () => openAuthPath("/login") },
            { text: "Sign up", onPress: () => openAuthPath("/register") },
          ]
        );
        return;
      }

      const normalized = toPersistableMovie(movie);
      setSavedMovies((prev) => {
        const exists = prev.some((m) => m.id === normalized.id);
        if (exists) {
          return prev.filter((m) => m.id !== normalized.id);
        }
        return [...prev, normalized];
      });
    },
    [user]
  );

  const isMovieSaved = useCallback(
    (movieId: number) => savedMovies.some((m) => m.id === movieId),
    [savedMovies]
  );

  const value = useMemo(
    () => ({
      savedMovies,
      isHydrated,
      isGuest,
      toggleMovie,
      isMovieSaved,
    }),
    [savedMovies, isHydrated, isGuest, toggleMovie, isMovieSaved]
  );

  return (
    <SavedMoviesContext.Provider value={value}>
      {children}
    </SavedMoviesContext.Provider>
  );
};

export const useSavedMovies = (): SavedMoviesContextValue => {
  const ctx = useContext(SavedMoviesContext);
  if (!ctx) {
    throw new Error("useSavedMovies must be used within SavedMoviesProvider");
  }
  return ctx;
};
