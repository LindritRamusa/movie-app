import {
  View,
  Text,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useMemo } from "react";
import * as WebBrowser from "expo-web-browser";

import { icons } from "@/constants/icons";
import useFetch from "@/services/useFetch";
import {
  fetchMovieDetails,
  fetchMovieVideos,
  pickYoutubeTrailerKey,
} from "@/services/api";
import { useSavedMovies } from "@/store/SavedMoviesContext";

interface MovieInfoProps {
  label: string;
  value?: string | number | null;
}

const MovieInfo = ({ label, value }: MovieInfoProps) => (
  <View className="flex-col items-start justify-center mt-5">
    <Text className="text-light-200 font-normal text-sm">{label}</Text>
    <Text className="text-light-100 font-bold text-sm mt-2">
      {value || "N/A"}
    </Text>
  </View>
);

const Details = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const movieId = useMemo(() => {
    const raw = id;
    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }
    return typeof raw === "string" ? raw : "";
  }, [id]);
  const { toggleMovie, isMovieSaved, isGuest } = useSavedMovies();

  const { data: movie, loading } = useFetch(() =>
    fetchMovieDetails(movieId)
  );

  const { data: videos, loading: videosLoading } = useFetch(() =>
    fetchMovieVideos(movieId)
  );

  const isSaved = movie ? isMovieSaved(movie.id) : false;

  const handlePressSave = useCallback(() => {
    if (!movie) {
      return;
    }
    toggleMovie(movie);
  }, [movie, toggleMovie]);

  const handlePressPlay = useCallback(async () => {
    if (!movie) {
      return;
    }
    if (videosLoading) {
      return;
    }
    const youtubeKey = videos ? pickYoutubeTrailerKey(videos) : null;
    if (youtubeKey) {
      await WebBrowser.openBrowserAsync(
        `https://www.youtube.com/watch?v=${youtubeKey}`
      );
      return;
    }
    if (movie.homepage) {
      await WebBrowser.openBrowserAsync(movie.homepage);
      return;
    }
    Alert.alert(
      "No trailer or link",
      "TMDB has no YouTube trailer or official site for this title yet."
    );
  }, [movie, videos, videosLoading]);

  if (loading)
    return (
      <SafeAreaView className="bg-primary flex-1">
        <ActivityIndicator />
      </SafeAreaView>
    );

  return (
    <View className="bg-primary flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View>
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500${movie?.poster_path}`,
            }}
            className="w-full h-[550px]"
            resizeMode="stretch"
          />

          <View className="absolute bottom-5 right-5 flex-row items-center gap-3">
            {movie ? (
              <TouchableOpacity
                className="rounded-full size-14 bg-white flex items-center justify-center"
                onPress={handlePressSave}
                accessibilityRole="button"
                accessibilityLabel={
                  isGuest
                    ? "Sign in to save movies"
                    : isSaved
                      ? "Remove from saved movies"
                      : "Save movie"
                }
              >
                <Image
                  source={icons.save}
                  className="w-6 h-6"
                  resizeMode="contain"
                  tintColor={
                    isGuest
                      ? "#9CA4AB"
                      : isSaved
                        ? "#AB8BFF"
                        : "#030014"
                  }
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              className="rounded-full size-14 bg-white flex items-center justify-center"
              onPress={() => void handlePressPlay()}
              disabled={!movie || videosLoading}
              accessibilityRole="button"
              accessibilityLabel={
                videosLoading ? "Loading trailer" : "Open trailer in YouTube"
              }
            >
              {videosLoading ? (
                <ActivityIndicator color="#030014" />
              ) : (
                <Image
                  source={icons.play}
                  className="w-6 h-7 ml-1"
                  resizeMode="stretch"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-col items-start justify-center mt-5 px-5">
          <Text className="text-white font-bold text-xl">{movie?.title}</Text>
          <View className="flex-row items-center gap-x-1 mt-2">
            <Text className="text-light-200 text-sm">
              {movie?.release_date?.split("-")[0]} •
            </Text>
            <Text className="text-light-200 text-sm">{movie?.runtime}m</Text>
          </View>

          <View className="flex-row items-center bg-dark-100 px-2 py-1 rounded-md gap-x-1 mt-2">
            <Image source={icons.star} className="size-4" />

            <Text className="text-white font-bold text-sm">
              {Math.round(movie?.vote_average ?? 0)}/10
            </Text>

            <Text className="text-light-200 text-sm">
              ({movie?.vote_count} votes)
            </Text>
          </View>

          <MovieInfo label="Overview" value={movie?.overview} />
          <MovieInfo
            label="Genres"
            value={movie?.genres?.map((g) => g.name).join(" • ") || "N/A"}
          />

          <View className="flex flex-row justify-between w-1/2">
            <MovieInfo
              label="Budget"
              value={`$${(movie?.budget ?? 0) / 1_000_000} million`}
            />
            <MovieInfo
              label="Revenue"
              value={`$${Math.round(
                (movie?.revenue ?? 0) / 1_000_000
              )} million`}
            />
          </View>

          <MovieInfo
            label="Production Companies"
            value={
              movie?.production_companies?.map((c) => c.name).join(" • ") ||
              "N/A"
            }
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-5 left-0 right-0 mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50"
        onPress={router.back}
      >
        <Image
          source={icons.arrow}
          className="size-5 mr-1 mt-0.5 rotate-180"
          tintColor="#fff"
        />
        <Text className="text-white font-semibold text-base">Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Details;
