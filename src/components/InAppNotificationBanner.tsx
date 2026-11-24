import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "../context/NotificationContext";
import { colors } from "../theme/colors";

const NOTIF_CONFIGS: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    badgeText: string;
  }
> = {
  user: {
    icon: "person-add",
    color: "#0284C7",
    bgColor: "#E0F2FE",
    badgeText: "NEW MEMBER",
  },
  kyc: {
    icon: "shield-checkmark",
    color: "#D97706",
    bgColor: "#FEF3C7",
    badgeText: "KYC AUDIT",
  },
  transaction: {
    icon: "swap-horizontal",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    badgeText: "ACTIVITY",
  },
  warning: {
    icon: "alert-circle",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    badgeText: "ATTENTION",
  },
  system: {
    icon: "notifications",
    color: colors.navy,
    bgColor: colors.lightBlue,
    badgeText: "AQUAPAY LIVE",
  },
};

export default function InAppNotificationBanner() {
  const { activeNotification, dismissNotification, markAsRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [translateY] = useState(() => new Animated.Value(-160));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (activeNotification) {
      // Spring down into view
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up and dismiss
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -160,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeNotification, translateY, opacity]);

  // Swipe up to dismiss PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dy < -8; // detect upward swipe
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -15) {
            dismissNotification();
          }
        },
      }),
    [dismissNotification]
  );

  if (!activeNotification) {
    return null;
  }

  const config = NOTIF_CONFIGS[activeNotification.type] || NOTIF_CONFIGS.system;

  const handlePress = () => {
    markAsRead(activeNotification.id);
    dismissNotification();
    if (activeNotification.actionRoute) {
      router.push(activeNotification.actionRoute as any);
    }
  };

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? 14 : 10) + 6;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlayContainer, { top: topOffset }]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bannerCard,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          style={styles.cardTouchArea}
        >
          {/* Leading Icon */}
          <View style={[styles.iconBox, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>

          {/* Text Content */}
          <View style={styles.contentBox}>
            {/* Tag & Timestamp row */}
            <View style={styles.metaRow}>
              <View style={[styles.tagPill, { backgroundColor: config.bgColor }]}>
                <View style={[styles.pulseDot, { backgroundColor: config.color }]} />
                <Text style={[styles.tagText, { color: config.color }]}>
                  {config.badgeText}
                </Text>
              </View>
              <Text style={styles.timeText}>Just now</Text>
            </View>

            {/* Title */}
            <Text style={styles.titleText} numberOfLines={1}>
              {activeNotification.title}
            </Text>

            {/* Message */}
            <Text style={styles.messageText} numberOfLines={2}>
              {activeNotification.message}
            </Text>
          </View>

          {/* Quick Dismiss Button */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={dismissNotification}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Subtle Swipe-Up Indicator */}
        <View style={styles.swipeIndicatorRow}>
          <View style={styles.swipeBar} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 999999,
    alignItems: "center",
  },
  bannerCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 6,
    // Android elevation & iOS shadow
    elevation: 9,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  cardTouchArea: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: 12,
  },
  contentBox: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 6,
  },
  swipeIndicatorRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  swipeBar: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
});
