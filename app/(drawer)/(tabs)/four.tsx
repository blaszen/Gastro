import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  Pressable,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const YOUTUBE_API_KEY = "AIzaSyCYYknR3dladjUBYV7ELCEWT9uLaPOf3z4";
const MAX_RESULTS = 10;
const { width, height } = Dimensions.get("window");

export default function TabFourScreen() {
  const [query, setQuery] = useState("cooking shorts");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const fetchVideos = async (searchTerm: string) => {
    setLoading(true);
    try {
      // Adding #shorts to query forces YouTube to return vertical cooking content
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        searchTerm + " #shorts"
      )}&type=video&videoDuration=short&maxResults=${MAX_RESULTS}&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(searchUrl);
      const data = await res.json();
      if (data.items) setVideos(data.items);
    } catch (err) {
      console.log("YouTube API error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos("cooking shorts");
  }, []);

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const renderVideoItem = ({ item, index }: { item: any; index: number }) => {
    const videoId = item.id.videoId;
    const isPlaying = index === activeVideoIndex;

    return (
      <View style={styles.cardContainer}>
        {/* Full Card Player Area */}
        <View style={styles.playerWrapper}>
          <YoutubePlayer
            height={height - 180}
            width={width}
            play={isPlaying}
            videoId={videoId}
            initialPlayerParams={{
              preventFullScreen: true,
              controls: true,
              modestbranding: true,
            }}
          />
        </View>

        {/* Bottom Overlay Info & Action */}
        <View style={styles.overlay}>
          <View style={styles.titleBox}>
            <Text style={styles.channelTitle} numberOfLines={1}>
              @{item.snippet.channelTitle}
            </Text>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {item.snippet.title}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.watchButton,
              pressed && styles.watchButtonPressed,
            ]}
            onPress={() =>
              Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
            }
          >
            <Ionicons name="logo-youtube" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.watchButtonText}>Watch on YouTube</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Floating Header Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search cooking videos..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => fetchVideos(query)}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={styles.searchButton}
          onPress={() => fetchVideos(query)}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0e7afe" />
          <Text style={styles.loadingText}>Fetching culinary reels...</Text>
        </View>
      ) : (
        /* Vertical Paging Feed */
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id.videoId}
          renderItem={renderVideoItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - 140}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    zIndex: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
  },
  cardContainer: {
    width: width,
    height: height - 140, // Perfectly fits visible screen area below header
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  playerWrapper: {
    width: width,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  titleBox: {
    marginBottom: 12,
  },
  channelTitle: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  videoTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  watchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
  },
  watchButtonPressed: {
    opacity: 0.8,
  },
  watchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
})