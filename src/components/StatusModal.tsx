import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export interface StatusModalProps {
  visible: boolean;
  type?: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  // Optional key-value highlight card (e.g. for user details & password)
  credentials?: {
    name?: string;
    role?: string;
    identifier?: string;
    password?: string;
  };
  note?: string;
}

export default function StatusModal({
  visible,
  type = "success",
  title,
  message,
  primaryButtonText = "Done",
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  credentials,
  note,
}: StatusModalProps) {
  const getIconConfig = () => {
    switch (type) {
      case "error":
        return {
          icon: "close" as const,
          circleBg: "#FEE2E2",
          iconColor: "#DC2626",
          outerRing: "#FEF2F2",
          btnColor: "#DC2626",
        };
      case "warning":
        return {
          icon: "alert" as const,
          circleBg: "#FEF3C7",
          iconColor: "#D97706",
          outerRing: "#FFFBEB",
          btnColor: "#D97706",
        };
      case "info":
        return {
          icon: "information" as const,
          circleBg: "#E0F2FE",
          iconColor: "#0284C7",
          outerRing: "#F0F9FF",
          btnColor: colors.blue,
        };
      case "success":
      default:
        return {
          icon: "checkmark" as const,
          circleBg: "#DCFCE7",
          iconColor: "#16A34A",
          outerRing: "#F0FDF4",
          btnColor: colors.blue,
        };
    }
  };

  const config = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onPrimaryPress}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Hero Icon Badge */}
          <View style={[styles.outerCircle, { backgroundColor: config.outerRing }]}>
            <View style={[styles.innerCircle, { backgroundColor: config.circleBg }]}>
              <Ionicons name={config.icon} size={30} color={config.iconColor} />
            </View>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Credentials / Details Box (If Provided) */}
          {credentials ? (
            <View style={styles.detailsBox}>
              {credentials.name ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{credentials.name}</Text>
                </View>
              ) : null}

              {credentials.role ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigned Role</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{credentials.role}</Text>
                  </View>
                </View>
              ) : null}

              {credentials.identifier ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Login ID / Mobile</Text>
                  <Text style={styles.detailValueBold}>
                    {credentials.identifier}
                  </Text>
                </View>
              ) : null}

              {credentials.password ? (
                <View style={[styles.detailRow, styles.passwordRow]}>
                  <Text style={styles.detailLabel}>Default Password</Text>
                  <View style={styles.passwordPill}>
                    <Ionicons name="key-outline" size={13} color="#0369A1" />
                    <Text style={styles.passwordPillText}>
                      {credentials.password}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Helpful Human Note */}
          {note ? (
            <View style={styles.noteBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#475569"
              />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: config.btnColor }]}
              onPress={onPrimaryPress}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{primaryButtonText}</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            {secondaryButtonText && onSecondaryPress ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondaryPress}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  outerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  innerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  roleBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
  },
  passwordRow: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  passwordPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 6,
  },
  passwordPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
    letterSpacing: 0.5,
  },
  noteBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
});
