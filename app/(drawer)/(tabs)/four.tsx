import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  Dimensions,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { WebView } from "react-native-webview";
const YOUTUBE_API_KEY = "AIzaSyCYYknR3dladjUBYV7ELCEWT9uLaPOf3z4";
const MAX_RESULTS = 10;
const { height, width } = Dimensions.get("window");

export default function TabFourScreen() {
  const [query, setQuery] = useState("easy cooking tutorial");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideos = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchTerm
        )}&type=video&maxResults=${MAX_RESULTS}&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      if (data.items) setVideos(data.items);
    } catch (err) {
      console.log("YouTube API error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos(query);
  }, []);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search cooking videos"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => fetchVideos(query)}
          style={styles.searchInput}
        />
        <Pressable
          style={styles.searchButton}
          onPress={() => fetchVideos(query)}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Search</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="small" style={{ marginTop: 20 }} />}

      {/* Vertical TikTok-style Scroll */}
      <ScrollView pagingEnabled showsVerticalScrollIndicator={false}>
        {videos.map((video) => (
          <View key={video.id.videoId} style={styles.videoContainer}>
            <YoutubePlayer
              height={height * 0.6} // take 60% of screen height
              width={width}
              play={true}
              videoId={video.id.videoId}
            />
            <View style={styles.overlay}>
              <Text style={styles.videoTitle}>{video.snippet.title}</Text>
              <Pressable
                style={styles.watchButton}
                onPress={() =>
                  Linking.openURL(
                    `https://www.youtube.com/watch?v=${video.id.videoId}`
                  )
                }
              >
                <Text style={styles.watchButtonText}>Open in YouTube</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  searchContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginVertical: 10,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: "#FF6347",
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  videoContainer: {
    height,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 20,
  },
  overlay: {
    marginTop: 10,
    width: width * 0.9,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  watchButton: {
    backgroundColor: "#FF6347",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  watchButtonText: { color: "#fff", fontWeight: "600" },
});
