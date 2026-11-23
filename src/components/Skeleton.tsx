import React, { useEffect, useState } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

export function UserCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Skeleton width={44} height={44} borderRadius={22} style={styles.avatar} />
        <View style={styles.infoCol}>
          <Skeleton width="55%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="75%" height={12} borderRadius={4} />
        </View>
        <Skeleton width={56} height={22} borderRadius={8} />
      </View>

      {/* Role Pill Row */}
      <View style={styles.middleRow}>
        <Skeleton width={80} height={22} borderRadius={6} />
        <Skeleton width={110} height={14} borderRadius={4} />
      </View>

      {/* Meta Hierarchy Row */}
      <View style={styles.metaRow}>
        <Skeleton width="60%" height={12} borderRadius={4} />
      </View>

      {/* Footer Row */}
      <View style={styles.footerRow}>
        <Skeleton width={110} height={14} borderRadius={4} />
        <View style={styles.actionsRow}>
          <Skeleton width={34} height={34} borderRadius={8} />
          <Skeleton width={34} height={34} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function UserListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <UserCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: "#E2E8F0",
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  metaRow: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightBlue,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
});
