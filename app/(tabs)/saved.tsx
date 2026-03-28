import MovieCard from "@/components/MovieCard";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useSavedMovies } from "@/store/SavedMoviesContext";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const Saved = () => {
  const router = useRouter();
  const { savedMovies, isHydrated, isGuest } = useSavedMovies();

  const renderItem: ListRenderItem<Movie> = useCallback(
    ({ item }) => <MovieCard {...item} />,
    []
  );

  const keyExtractor = useCallback((item: Movie) => item.id.toString(), []);

  const handlePressSignIn = useCallback(() => {
    router.push("/login");
  }, [router]);

  const handlePressSignUp = useCallback(() => {
    router.push("/register");
  }, [router]);

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View className="flex-1 bg-primary">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />

        <View className="w-full flex-row mt-20 items-center px-5 mb-10">
          <Image source={icons.logo} className="w-12 h-10 mr-4" />
          <Text className="text-3xl font-bold text-white">Saved Movies</Text>
        </View>

        <View className="flex-1 justify-center items-center pb-20 px-5">
          <Image
            source={icons.save}
            className="w-24 h-24 mb-6"
            tintColor="#fff"
          />
          <Text className="text-white text-2xl font-bold mb-2 text-center">
            Sign in to save movies
          </Text>
          <Text className="text-light-200 text-base text-center mb-8 leading-6">
            Your saved list is tied to your account. Sign in or create an
            account to save movies and see them here.
          </Text>
          <TouchableOpacity
            className="bg-accent w-full max-w-sm py-3.5 rounded-xl items-center mb-3"
            onPress={handlePressSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text className="text-white font-bold text-base">Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-dark-100 border border-dark-200 w-full max-w-sm py-3.5 rounded-xl items-center"
            onPress={handlePressSignUp}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text className="text-white font-bold text-base">Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (savedMovies.length === 0) {
    return (
      <View className="flex-1 bg-primary">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />

        <View className="w-full flex-row mt-20 items-center px-5 mb-10">
          <Image source={icons.logo} className="w-12 h-10 mr-4" />
          <Text className="text-3xl font-bold text-white">Saved Movies</Text>
        </View>

        <View className="flex-1 justify-center items-center pb-20">
          <Image
            source={icons.save}
            className="w-24 h-24 mb-6"
            tintColor="#fff"
          />
          <Text className="text-white text-2xl font-bold mb-2">
            No Saved Movies
          </Text>
          <Text className="text-light-200 text-base text-center px-10">
            When you save movies, they will appear here so you can easily find
            them later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full h-full z-0"
        resizeMode="cover"
      />

      <FlatList
        data={savedMovies}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        className="px-5"
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: "center",
          gap: 16,
          marginVertical: 16,
        }}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListHeaderComponent={
          <View className="w-full flex-row mt-20 items-center px-0 mb-2">
            <Image source={icons.logo} className="w-12 h-10 mr-4" />
            <Text className="text-3xl font-bold text-white">Saved Movies</Text>
          </View>
        }
      />
    </View>
  );
};

export default Saved;
