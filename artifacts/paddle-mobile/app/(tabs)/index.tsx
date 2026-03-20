import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  useGetWeatherForecast,
  useGeocodeLocation,
} from "@workspace/api-client-react";
import type {
  GeocodeLocation,
  DayForecast,
  WeatherForecast,
} from "@workspace/api-client-react/src/generated/api.schemas";
import { ocean } from "@/constants/colors";
import { ForecastCard } from "@/components/ForecastCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodeLocation | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: geocodeData, isFetching: isSearching } = useGeocodeLocation(
    { query: debouncedSearch },
    { query: { enabled: debouncedSearch.trim().length > 2 } }
  );

  const {
    data: forecast,
    isLoading,
    isError,
    refetch,
    isFetching: isForecastFetching,
  } = useGetWeatherForecast(
    {
      lat: selectedLocation?.lat as number,
      lon: selectedLocation?.lon as number,
      locationName: selectedLocation?.name,
    },
    {
      query: {
        enabled: !!selectedLocation,
        staleTime: 1000 * 60 * 15,
        retry: 1,
      },
    }
  );

  const handleSelectLocation = useCallback((loc: GeocodeLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLocation(loc);
    setSearchText(loc.name);
    setDebouncedSearch("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleClearLocation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLocation(null);
    setSearchText("");
    setDebouncedSearch("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const showDropdown =
    searchFocused &&
    debouncedSearch.trim().length > 2 &&
    !selectedLocation &&
    (!!geocodeData?.results?.length || isSearching);

  const listData: DayForecast[] = forecast?.days ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Feather name="wind" size={18} color={ocean.teal} />
          </View>
          <Text style={styles.brandName}>Paddle Planner</Text>
        </View>

        <View
          style={[
            styles.searchWrap,
            searchFocused && styles.searchWrapFocused,
          ]}
        >
          <Feather
            name="search"
            size={16}
            color={searchFocused ? ocean.teal : ocean.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search beach or town..."
            placeholderTextColor={ocean.textMuted}
            value={searchText}
            onChangeText={(t) => {
              setSearchText(t);
              if (selectedLocation) setSelectedLocation(null);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {(searchText.length > 0 || !!selectedLocation) && (
            <Pressable
              onPress={handleClearLocation}
              hitSlop={8}
              style={styles.clearBtn}
            >
              <Feather name="x" size={15} color={ocean.textSecondary} />
            </Pressable>
          )}
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            {isSearching && !geocodeData?.results?.length ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="small" color={ocean.teal} />
                <Text style={styles.dropdownHint}>Searching...</Text>
              </View>
            ) : (
              geocodeData?.results?.map((loc) => (
                <Pressable
                  key={`${loc.lat}-${loc.lon}`}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    pressed && styles.dropdownItemPressed,
                  ]}
                  onPress={() => handleSelectLocation(loc)}
                >
                  <Feather
                    name="map-pin"
                    size={14}
                    color={ocean.teal}
                    style={styles.dropdownPinIcon}
                  />
                  <View style={styles.dropdownTextWrap}>
                    <Text style={styles.dropdownName}>{loc.name}</Text>
                    {(loc.admin1 || loc.country) && (
                      <Text style={styles.dropdownSub}>
                        {[loc.admin1, loc.country].filter(Boolean).join(", ")}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* Main content */}
      {!selectedLocation ? (
        <EmptyState />
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : forecast ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => <ForecastCard day={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
          ListHeaderComponent={<ForecastHeader forecast={forecast} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isForecastFetching && !isLoading}
              onRefresh={refetch}
              tintColor={ocean.teal}
              colors={[ocean.teal]}
            />
          }
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function ForecastHeader({ forecast }: { forecast: WeatherForecast }) {
  const bestScore = Math.max(...forecast.days.map((d) => d.score));
  const bestDay = forecast.days.find((d) => d.score === bestScore);

  return (
    <View style={fhStyles.wrap}>
      <View style={fhStyles.locationRow}>
        <Feather name="map-pin" size={14} color={ocean.teal} />
        <Text style={fhStyles.locationName}>{forecast.locationName}</Text>
      </View>
      <Text style={fhStyles.coords}>
        {Math.abs(forecast.lat).toFixed(3)}°{forecast.lat >= 0 ? "N" : "S"}{" "}
        {Math.abs(forecast.lon).toFixed(3)}°{forecast.lon >= 0 ? "E" : "W"}
      </Text>
      {bestDay && (
        <View style={fhStyles.bestDayBanner}>
          <Feather name="star" size={12} color={ocean.epic} />
          <Text style={fhStyles.bestDayText}>
            Best day:{" "}
            <Text style={fhStyles.bestDayHighlight}>{bestDay.dayLabel}</Text>
            {" — "}{bestScore.toFixed(1)}/10
          </Text>
        </View>
      )}
    </View>
  );
}

const fhStyles = StyleSheet.create({
  wrap: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  locationName: {
    fontFamily: "Inter_700Bold",
    fontSize: 21,
    color: ocean.text,
  },
  coords: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: ocean.textMuted,
    marginTop: 3,
    marginLeft: 21,
  },
  bestDayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: ocean.epicBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  bestDayText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: ocean.textSecondary,
  },
  bestDayHighlight: {
    fontFamily: "Inter_700Bold",
    color: ocean.epic,
  },
});

function EmptyState() {
  return (
    <View style={stateStyles.container}>
      <View style={stateStyles.iconWrap}>
        <Feather name="compass" size={44} color={ocean.teal} />
      </View>
      <Text style={stateStyles.title}>Find your run</Text>
      <Text style={stateStyles.subtitle}>
        Search for a beach to see 7 days of downwind paddle conditions, scored
        by wind and swell alignment.
      </Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={stateStyles.container}>
      <ActivityIndicator
        size="large"
        color={ocean.teal}
        style={{ marginBottom: 18 }}
      />
      <Text style={stateStyles.loadingTitle}>Analysing conditions...</Text>
      <Text style={stateStyles.subtitle}>
        Detecting shoreline direction and fetching 7-day marine forecast
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={stateStyles.container}>
      <View style={[stateStyles.iconWrap, { backgroundColor: ocean.poorBg }]}>
        <Feather name="alert-triangle" size={38} color={ocean.poor} />
      </View>
      <Text style={stateStyles.title}>Forecast unavailable</Text>
      <Text style={stateStyles.subtitle}>
        We couldn't fetch the marine data. Check your connection and try again.
      </Text>
      <Pressable
        style={({ pressed }) => [
          stateStyles.retryBtn,
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRetry();
        }}
      >
        <Feather name="refresh-cw" size={15} color={ocean.bg} />
        <Text style={stateStyles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const stateStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: ocean.tealGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: ocean.text,
    marginBottom: 10,
    textAlign: "center",
  },
  loadingTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: ocean.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: ocean.textSecondary,
    lineHeight: 21,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ocean.teal,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: ocean.bg,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ocean.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: ocean.bg,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: ocean.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ocean.tealGlow,
    borderWidth: 1,
    borderColor: ocean.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: ocean.text,
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ocean.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ocean.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchWrapFocused: {
    borderColor: ocean.borderStrong,
    backgroundColor: ocean.bgCard,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: ocean.text,
    height: 48,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 6,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 20,
    right: 20,
    backgroundColor: ocean.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ocean.border,
    overflow: "hidden",
    zIndex: 100,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    marginTop: 6,
  },
  dropdownLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  dropdownHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: ocean.textSecondary,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: ocean.border,
  },
  dropdownItemPressed: {
    backgroundColor: ocean.bgSurface,
  },
  dropdownPinIcon: {
    marginRight: 12,
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: ocean.text,
  },
  dropdownSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: ocean.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
