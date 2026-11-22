import React, { useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { isRemoteUrl } from "../lib/uploadImage";
import { themedStyles, useThemeMode } from "../lib/theme";

type Props = {
  uri?: string | null;
  title?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  iconSize?: number;
};

/**
 * Recipe photo with a branded placeholder. Only web URLs are shown: older
 * recipes saved an on-device file path that no other phone can load, and a
 * broken link falls back to the placeholder instead of a blank box.
 */
export default function RecipeImage({ uri, title, style, imageStyle, iconSize = 26 }: Props) {
  useThemeMode();
  const [failed, setFailed] = useState(false);
  const showImage = isRemoteUrl(uri) && !failed;

  return (
    <View style={[styles.container, style]}>
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={[StyleSheet.absoluteFillObject, styles.image, imageStyle]}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <View
            style={[
              styles.iconCircle,
              { width: iconSize * 2.15, height: iconSize * 2.15, borderRadius: iconSize * 1.1 },
              iconSize < 20 && { marginBottom: 0 },
            ]}
          >
            <MaterialCommunityIcons name="chef-hat" size={iconSize} color="#f59e0b" />
          </View>
          {title && iconSize >= 20 ? (
            <Text style={styles.tag} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = themedStyles({
  container: { overflow: "hidden", backgroundColor: "#181b20" },
  image: { resizeMode: "cover" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tag: { color: "#a1a1aa", fontSize: 13, fontWeight: "700", maxWidth: "80%" },
});
