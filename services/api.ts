export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
  },
};

export const fetchMovies = async ({
  query,
}: {
  query: string;
}): Promise<Movie[]> => {
  const endpoint = query
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch movies: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
};

export const fetchMovieDetails = async (
  movieId: string
): Promise<MovieDetails> => {
  const response = await fetch(
    `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`,
    {
      method: "GET",
      headers: TMDB_CONFIG.headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch movie details: ${response.statusText}`);
  }

  return response.json();
};

export const fetchMovieVideos = async (
  movieId: string
): Promise<MovieVideo[]> => {
  const response = await fetch(
    `${TMDB_CONFIG.BASE_URL}/movie/${movieId}/videos`,
    {
      method: "GET",
      headers: TMDB_CONFIG.headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch videos: ${response.statusText}`);
  }

  const data = (await response.json()) as { results?: MovieVideo[] };
  return data.results ?? [];
};

export const pickYoutubeTrailerKey = (
  videos: MovieVideo[]
): string | null => {
  const yt = videos.filter(
    (v) => v.site === "YouTube" && typeof v.key === "string" && v.key.length > 0
  );
  if (yt.length === 0) {
    return null;
  }
  const rank = (v: MovieVideo) => {
    const t = v.type?.toLowerCase() ?? "";
    if (t === "trailer" && v.official) {
      return 0;
    }
    if (t === "trailer") {
      return 1;
    }
    if (t === "teaser") {
      return 2;
    }
    return 3;
  };
  yt.sort((a, b) => rank(a) - rank(b));
  return yt[0]?.key ?? null;
};