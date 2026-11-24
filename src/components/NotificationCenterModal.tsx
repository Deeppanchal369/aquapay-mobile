import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InAppNotification, useNotifications } from "../context/NotificationContext";
import { colors } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function NotificationCenterModal({ visible, onClose }: Props) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    simulateLiveEvent,
  } = useNotifications();
  const router = useRouter();

  const handleSelect = (notif: InAppNotification) => {
    markAsRead(notif.id);
    onClose();
    if (notif.actionRoute) {
      router.push(notif.actionRoute as any);
    }
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case "user":
        return { icon: "person-add" as const, color: "#0284C7", bg: "#E0F2FE" };
      case "kyc":
        return { icon: "shield-checkmark" as const, color: "#D97706", bg: "#FEF3C7" };
      case "transaction":
        return { icon: "swap-horizontal" as const, color: "#16A34A", bg: "#DCFCE7" };
      case "warning":
        return { icon: "alert-circle" as const, color: "#DC2626", bg: "#FEE2E2" };
      default:
        return { icon: "notifications" as const, color: colors.navy, bg: colors.lightBlue };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellBadgeWrapper}>
                <Ionicons name="notifications" size={20} color={colors.navy} />
                {unreadCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.sheetTitle}>Live Activity & Alerts</Text>
                <Text style={styles.sheetSubtitle}>
                  Real-time events across member network
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Action Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Ionicons
                name="checkmark-done"
                size={15}
                color={unreadCount > 0 ? colors.blue : "#94A3B8"}
              />
              <Text
                style={[
                  styles.toolbarBtnText,
                  { color: unreadCount > 0 ? colors.blue : "#94A3B8" },
                ]}
              >
                Mark read
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarBtn, styles.simulateBtn]}
              onPress={() => {
                simulateLiveEvent();
              }}
            >
              <Ionicons name="flash" size={14} color="#D97706" />
              <Text style={[styles.toolbarBtnText, { color: "#D97706" }]}>
                Test Live Alert
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={clearAll}
              disabled={notifications.length === 0}
            >
              <Ionicons
                name="trash-outline"
                size={14}
                color={notifications.length > 0 ? "#64748B" : "#CBD5E1"}
              />
              <Text
                style={[
                  styles.toolbarBtnText,
                  { color: notifications.length > 0 ? "#64748B" : "#CBD5E1" },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="notifications-off-outline"
                  size={36}
                  color="#94A3B8"
                />
              </View>
              <Text style={styles.emptyTitle}>No Recent Activities</Text>
              <Text style={styles.emptyDesc}>
                Ongoing user registrations, KYC audits, and network events will
                appear here in real time.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => simulateLiveEvent()}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Trigger Sample Alert</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const conf = getIconConfig(item.type);
                return (
                  <TouchableOpacity
                    style={[
                      styles.notifItem,
                      !item.read && styles.notifItemUnread,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[styles.notifIconBox, { backgroundColor: conf.bg }]}
                    >
                      <Ionicons name={conf.icon} size={20} color={conf.color} />
                    </View>

                    <View style={styles.notifTextBox}>
                      <View style={styles.notifTitleRow}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.notifTime}>
                          {formatRelativeTime(item.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.notifMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>

                    {!item.read && <View style={styles.unreadIndicator} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    minHeight: "50%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellBadgeWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  simulateBtn: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  notifItemUnread: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifTextBox: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  notifMessage: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.navy,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
});
