import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import ScreenHeader from "../../components/ScreenHeader";
import { auth } from "../../lib/firebase";
import { LEVELS, TOTAL_LESSONS, nextLesson, rankFor } from "../../lib/curriculum";
import { useLessonProgress } from "../../lib/progress";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

export default function MasterclassScreen() {
  useThemeMode();
  const router = useRouter();
  const { done, loading } = useLessonProgress(auth.currentUser?.uid);
  const completed = done.size;
  const { current, next } = rankFor(completed);
  const upNext = nextLesson(done);

  // Open the first level that isn't finished yet.
  const firstOpen = LEVELS.find((l) => l.lessons.some((x) => !done.has(x.id)))?.id ?? LEVELS[0].id;
  const [expanded, setExpanded] = useState<string | null>(null);
  const openId = expanded ?? firstOpen;

  const pct = completed / TOTAL_LESSONS;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="Masterclass" subtitle="From basics to chef level" />

      {loading ? (
        <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Rank & progress */}
          <View style={styles.rankCard}>
            <View style={styles.rankTop}>
              <View style={styles.rankBadge}>
                <FontAwesome name="trophy" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankLabel}>Your rank</Text>
                <Text style={styles.rankTitle}>{current.title}</Text>
              </View>
              <Text style={styles.rankCount}>
                {completed}/{TOTAL_LESSONS}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(pct * 100, completed ? 4 : 0)}%` }]} />
            </View>
            <Text style={styles.rankHint}>
              {next
                ? `${next.min - completed} more lesson${next.min - completed === 1 ? "" : "s"} to ${next.title}`
                : "You've reached the top rank. Chapeau, Chef!"}
            </Text>

            {upNext ? (
              <Pressable style={styles.continueBtn} onPress={() => router.push(`/lesson/${upNext.id}` as any)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueLabel}>{completed ? "Continue" : "Start here"}</Text>
                  <Text style={styles.continueTitle} numberOfLines={1}>
                    {upNext.title}
                  </Text>
                </View>
                <View style={styles.playCircle}>
                  <FontAwesome name="play" size={12} color="#f59e0b" style={{ marginLeft: 2 }} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* Levels */}
          {LEVELS.map((level) => {
            const levelDone = level.lessons.filter((x) => done.has(x.id)).length;
            const complete = levelDone === level.lessons.length;
            const isOpen = openId === level.id;
            return (
              <View key={level.id} style={styles.levelWrap}>
                <Pressable style={styles.levelCard} onPress={() => setExpanded(isOpen ? "" : level.id)}>
                  <Image source={{ uri: level.image }} style={styles.levelImage} />
                  <View style={styles.levelShade} />
                  <View style={styles.levelShadeBottom} />
                  <View style={styles.levelBody}>
                    <View style={styles.levelTopRow}>
                      <View style={styles.levelNum}>
                        <Text style={styles.levelNumText}>LEVEL {level.number}</Text>
                      </View>
                      {complete ? (
                        <View style={styles.doneChip}>
                          <FontAwesome name="check" size={10} color="#0f1115" />
                          <Text style={styles.doneChipText}>Complete</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.levelTitle}>{level.title}</Text>
                    <Text style={styles.levelTagline} numberOfLines={2}>
                      {level.tagline}
                    </Text>
                    <View style={styles.levelFooter}>
                      <View style={styles.levelTrack}>
                        <View
                          style={[styles.levelFill, { width: `${(levelDone / level.lessons.length) * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.levelCount}>
                        {levelDone}/{level.lessons.length}
                      </Text>
                      <FontAwesome name={isOpen ? "chevron-up" : "chevron-down"} size={12} color="#ffffff" />
                    </View>
                  </View>
                </Pressable>

                {isOpen ? (
                  <View style={styles.lessonList}>
                    {level.lessons.map((lesson, i) => {
                      const isDone = done.has(lesson.id);
                      const isNext = upNext?.id === lesson.id;
                      return (
                        <Pressable
                          key={lesson.id}
                          style={[styles.lessonRow, isNext && styles.lessonRowNext]}
                          onPress={() => router.push(`/lesson/${lesson.id}` as any)}
                        >
                          <View style={[styles.lessonDot, isDone && styles.lessonDotDone]}>
                            {isDone ? (
                              <FontAwesome name="check" size={11} color={tc("#0f1115")} />
                            ) : (
                              <Text style={styles.lessonDotText}>{i + 1}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.lessonTitle, isDone && styles.lessonTitleDone]} numberOfLines={1}>
                              {lesson.title}
                            </Text>
                            <Text style={styles.lessonSummary} numberOfLines={1}>
                              {lesson.summary}
                            </Text>
                          </View>
                          <Text style={styles.lessonMin}>{lesson.minutes} min</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.footNote}>
            Lessons are written by the Gastro team. Each one links to video demos on YouTube if you'd like to watch
            it done.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = themedStyles({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  rankCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
  },
  rankTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  rankBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabel: { color: "#a1a1aa", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  rankTitle: { color: "#f4f4f5", fontSize: 20, fontWeight: "900", marginTop: 2 },
  rankCount: { color: "#f59e0b", fontSize: 16, fontWeight: "900" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#27272a", marginTop: 16, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: "#f59e0b" },
  rankHint: { color: "#a1a1aa", fontSize: 13, marginTop: 8 },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
  },
  continueLabel: { color: "#0f1115", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  continueTitle: { color: "#0f1115", fontSize: 16, fontWeight: "900", marginTop: 2 },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0f1115",
    alignItems: "center",
    justifyContent: "center",
  },

  levelWrap: { marginBottom: 14 },
  levelCard: { height: 170, borderRadius: 22, overflow: "hidden", backgroundColor: "#181b20" },
  levelImage: { position: "absolute", width: "100%", height: "100%" },
  levelShade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(15,17,21,0.35)" },
  levelShadeBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%", backgroundColor: "rgba(15,17,21,0.55)" },
  levelBody: { flex: 1, padding: 16, justifyContent: "flex-end" },
  levelTopRow: { position: "absolute", top: 14, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  levelNum: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(15,17,21,0.7)",
  },
  levelNumText: { color: "#f59e0b", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
  },
  doneChipText: { color: "#0f1115", fontSize: 11, fontWeight: "900" },
  levelTitle: { color: "#ffffff", fontSize: 24, fontWeight: "900" },
  levelTagline: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  levelFooter: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  levelTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  levelFill: { height: 5, borderRadius: 3, backgroundColor: "#f59e0b" },
  levelCount: { color: "#ffffff", fontSize: 12, fontWeight: "800" },

  lessonList: { marginTop: 8, gap: 8 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  lessonRowNext: { borderColor: "rgba(245, 158, 11, 0.55)" },
  lessonDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#3f3f46",
    alignItems: "center",
    justifyContent: "center",
  },
  lessonDotDone: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  lessonDotText: { color: "#a1a1aa", fontSize: 12, fontWeight: "800" },
  lessonTitle: { color: "#f4f4f5", fontSize: 15, fontWeight: "700" },
  lessonTitleDone: { color: "#a1a1aa" },
  lessonSummary: { color: "#71717a", fontSize: 12, marginTop: 2 },
  lessonMin: { color: "#71717a", fontSize: 12, fontWeight: "600" },

  footNote: { color: "#71717a", fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
});
