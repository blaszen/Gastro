import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenHeader from "../../components/ScreenHeader";
import { auth } from "../../lib/firebase";
import { ALL_LESSONS, LEVELS, findLesson, rankFor } from "../../lib/curriculum";
import { setLessonComplete, useLessonProgress } from "../../lib/progress";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

export default function LessonScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = findLesson(String(id));
  const uid = auth.currentUser?.uid;
  const { done } = useLessonProgress(uid);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Lesson" />
        <Text style={styles.missing}>This lesson couldn't be found.</Text>
      </SafeAreaView>
    );
  }

  const level = LEVELS.find((l) => l.id === lesson.levelId)!;
  const indexInLevel = level.lessons.findIndex((l) => l.id === lesson.id);
  const globalIndex = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
  const nextUp = ALL_LESSONS[globalIndex + 1];
  const isDone = done.has(lesson.id);

  const toggleStep = (i: number) =>
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const toggleComplete = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await setLessonComplete(uid, lesson.id, !isDone);
      if (!isDone) {
        const before = rankFor(done.size).current.title;
        const after = rankFor(done.size + 1).current.title;
        if (after !== before) Alert.alert("Rank up! 🎉", `You're now a ${after}. Keep cooking!`);
      }
    } catch (err) {
      console.error("Progress save failed:", err);
      Alert.alert("Error", "Couldn't save your progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openVideos = () =>
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.videoQuery)}`).catch(
      () => Alert.alert("Couldn't open YouTube")
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title={`Level ${level.number} · ${indexInLevel + 1}/${level.lessons.length}`} subtitle={level.title} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: level.image }} style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroBody}>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <FontAwesome name="clock-o" size={11} color="#f59e0b" />
                <Text style={styles.metaText}>{lesson.minutes} min read</Text>
              </View>
              {isDone ? (
                <View style={[styles.metaChip, styles.metaChipDone]}>
                  <FontAwesome name="check" size={10} color="#0f1115" />
                  <Text style={[styles.metaText, { color: "#0f1115" }]}>Completed</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.title}>{lesson.title}</Text>
            <Text style={styles.summary}>{lesson.summary}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Method</Text>
        {lesson.steps.map((step, i) => {
          const on = checked.has(i);
          return (
            <Pressable key={i} style={styles.stepRow} onPress={() => toggleStep(i)}>
              <View style={[styles.stepNum, on && styles.stepNumOn]}>
                {on ? (
                  <FontAwesome name="check" size={11} color={tc("#0f1115")} />
                ) : (
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepText, on && styles.stepTextOn]}>{step}</Text>
            </Pressable>
          );
        })}

        <View style={styles.boxTips}>
          <View style={styles.boxHead}>
            <FontAwesome name="lightbulb-o" size={16} color="#f59e0b" />
            <Text style={styles.boxTitle}>Chef's Tips</Text>
          </View>
          {lesson.tips.map((t, i) => (
            <Text key={i} style={styles.boxItem}>
              • {t}
            </Text>
          ))}
        </View>

        <View style={styles.boxMistakes}>
          <View style={styles.boxHead}>
            <FontAwesome name="exclamation-triangle" size={14} color="#ef4444" />
            <Text style={styles.boxTitle}>Common Mistakes</Text>
          </View>
          {lesson.mistakes.map((t, i) => (
            <Text key={i} style={styles.boxItem}>
              • {t}
            </Text>
          ))}
        </View>

        <View style={styles.practice}>
          <Text style={styles.practiceLabel}>PRACTICE TASK</Text>
          <Text style={styles.practiceText}>{lesson.practice}</Text>
        </View>

        <Pressable style={styles.videoBtn} onPress={openVideos}>
          <FontAwesome name="youtube-play" size={18} color="#ef4444" />
          <Text style={styles.videoText}>Watch demos on YouTube</Text>
          <FontAwesome name="external-link" size={12} color={tc("#71717a")} />
        </Pressable>

        <Pressable
          style={[styles.completeBtn, isDone && styles.completeBtnDone]}
          onPress={toggleComplete}
          disabled={saving || !uid}
        >
          {saving ? (
            <ActivityIndicator color={isDone ? "#f59e0b" : tc("#0f1115")} />
          ) : (
            <>
              <FontAwesome name={isDone ? "undo" : "check"} size={14} color={isDone ? "#f59e0b" : tc("#0f1115")} />
              <Text style={[styles.completeText, isDone && styles.completeTextDone]}>
                {isDone ? "Mark as not done" : "Mark lesson complete"}
              </Text>
            </>
          )}
        </Pressable>

        {nextUp ? (
          <Pressable style={styles.nextCard} onPress={() => router.replace(`/lesson/${nextUp.id}` as any)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>
                Up next{nextUp.levelId !== lesson.levelId ? ` · Level ${nextUp.levelNumber}: ${nextUp.levelTitle}` : ""}
              </Text>
              <Text style={styles.nextTitle}>{nextUp.title}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#f59e0b" />
          </Pressable>
        ) : (
          <View style={styles.nextCard}>
            <Text style={styles.nextTitle}>That's the whole path. You've cooked your way to chef level. 👨‍🍳</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  missing: { color: "#a1a1aa", textAlign: "center", marginTop: 40 },

  hero: { height: 220, borderRadius: 22, overflow: "hidden", marginBottom: 22, backgroundColor: "#181b20" },
  heroImage: { position: "absolute", width: "100%", height: "100%" },
  heroShade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(15,17,21,0.58)" },
  heroBody: { flex: 1, padding: 18, justifyContent: "flex-end" },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(15,17,21,0.7)",
  },
  metaChipDone: { backgroundColor: "#f59e0b" },
  metaText: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  title: { color: "#ffffff", fontSize: 26, fontWeight: "900" },
  summary: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4, lineHeight: 20 },

  sectionLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumOn: { backgroundColor: "#f59e0b" },
  stepNumText: { color: "#f59e0b", fontWeight: "900", fontSize: 13 },
  stepText: { flex: 1, color: "#f4f4f5", fontSize: 15, lineHeight: 23 },
  stepTextOn: { color: "#71717a", textDecorationLine: "line-through" },

  boxTips: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    marginTop: 8,
    marginBottom: 12,
  },
  boxMistakes: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
    marginBottom: 12,
  },
  boxHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  boxTitle: { color: "#f4f4f5", fontSize: 15, fontWeight: "800" },
  boxItem: { color: "#d4d4d8", fontSize: 14, lineHeight: 21, marginTop: 2 },

  practice: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 12,
  },
  practiceLabel: { color: "#f59e0b", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  practiceText: { color: "#f4f4f5", fontSize: 15, marginTop: 6, lineHeight: 22, fontWeight: "600" },

  videoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 18,
  },
  videoText: { flex: 1, color: "#f4f4f5", fontSize: 15, fontWeight: "700" },

  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f59e0b",
  },
  completeBtnDone: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#f59e0b" },
  completeText: { color: "#0f1115", fontSize: 16, fontWeight: "900" },
  completeTextDone: { color: "#f59e0b" },

  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginTop: 14,
  },
  nextLabel: { color: "#a1a1aa", fontSize: 12, fontWeight: "700" },
  nextTitle: { color: "#f4f4f5", fontSize: 16, fontWeight: "800", marginTop: 2 },
});
