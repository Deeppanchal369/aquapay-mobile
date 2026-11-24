import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDescendantRoles, fetchUsers, RoleItem } from "../../api/users";
import KycVerificationFlow from "../../components/KycVerificationFlow";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import { getUserKyc, UserKycRecord } from "../../utils/kycStore";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [descendantRoles, setDescendantRoles] = useState<RoleItem[]>([]);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [kycRecord, setKycRecord] = useState<UserKycRecord | null>(null);

  const loadKyc = useCallback(async () => {
    if (user?.id) {
      try {
        const rec = await getUserKyc(user.id);
        setKycRecord(rec);
      } catch {
        // quiet fallback
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadKyc();
    }, [loadKyc])
  );

  useEffect(() => {
    let isMounted = true;
    async function checkHierarchy() {
      try {
        const [roles, userList] = await Promise.all([
          fetchDescendantRoles(),
          fetchUsers(),
        ]);
        if (isMounted) {
          setDescendantRoles(roles);
          setTeamCount(userList.length);
        }
      } catch {
        // quiet fallback
      }
    }
    checkHierarchy();
    return () => {
      isMounted = false;
    };
  }, []);

  const roleDisplay =
    user?.role_name || (user?.role ? user.role.toUpperCase() : "MEMBER");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Enlarged, Crisp AquaPay Logo Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require("../../../assets/images/company/Aqyapay logo.jpeg")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Header Bar with Subtitle and Role Badge */}
        <View style={styles.headerBar}>
          <Text style={styles.headerSubtitle}>Fintech & KYC Portal</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
          </View>
        </View>

        {/* Welcome Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push("/(user)/profile" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={26} color={colors.navy} />
          </View>
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.greetingText}>Welcome,</Text>
              <View style={styles.profileViewBadge}>
                <Text style={styles.profileViewBadgeText}>My Profile</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.blue} />
              </View>
            </View>
            <Text style={styles.profileName}>{user?.name || "Member"}</Text>
            <Text style={styles.profileEmail}>
              {user?.email || "user@example.com"}
            </Text>
            <Text style={styles.profileMeta}>
              Mobile: {user?.mobile || "N/A"}{" "}
              {user?.shopname ? `• ${user.shopname}` : ""}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Subordinate Role: Team & Merchant Network (Strictly Gated by 7-Step KYC Approval) */}
        {descendantRoles.length > 0 ? (
          kycRecord?.status === "approved" ? (
            <View style={styles.teamCard}>
              <View style={styles.teamHeaderRow}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.teamCardTitle}>Hierarchy Network</Text>
                    <View style={styles.approvedBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                      <Text style={styles.approvedBadgeText}>APPROVED</Text>
                    </View>
                  </View>
                  <Text style={styles.teamCardSubtitle}>
                    {teamCount !== null
                      ? `${teamCount} member${teamCount === 1 ? "" : "s"} created by your account`
                      : "Manage subordinate accounts"}
                  </Text>
                </View>
                <View style={styles.rolesCountBadge}>
                  <Text style={styles.rolesCountBadgeText}>
                    {descendantRoles.length} ROLES
                  </Text>
                </View>
              </View>

              <View style={styles.teamActionsRow}>
                <TouchableOpacity
                  style={styles.teamPrimaryBtn}
                  onPress={() => router.push("/(user)/add-member" as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={16} color="#FFFFFF" />
                  <Text style={styles.teamPrimaryBtnText}>Add Member</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.teamSecondaryBtn}
                  onPress={() => router.push("/(user)/team" as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people-outline" size={16} color={colors.navy} />
                  <Text style={styles.teamSecondaryBtnText}>View My Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.kycGateCard}>
              <View style={styles.kycGateHeaderRow}>
                <View style={styles.kycGateIconWrap}>
                  <Ionicons name="lock-closed" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kycGateTitle}>Hierarchy Network (Locked)</Text>
                  <Text style={styles.kycGateSubtitle}>
                    Account creation & team management requires approved KYC
                  </Text>
                </View>
              </View>

              <View style={styles.kycGatePhaseBox}>
                <View style={styles.kycGatePhaseBadge}>
                  <Ionicons
                    name={
                      kycRecord?.completedSteps?.includes(1)
                        ? "time"
                        : "alert-circle"
                    }
                    size={13}
                    color={
                      kycRecord?.completedSteps?.includes(1)
                        ? "#0284C7"
                        : "#D97706"
                    }
                  />
                  <Text
                    style={[
                      styles.kycGatePhaseBadgeText,
                      {
                        color: kycRecord?.completedSteps?.includes(1)
                          ? "#0284C7"
                          : "#D97706",
                      },
                    ]}
                  >
                    {kycRecord?.completedSteps?.includes(1)
                      ? "Phase: Step 1 Done • Step 2 Aadhaar Pending"
                      : "Phase: Step 1 Basic Details Required"}
                  </Text>
                </View>
                <Text style={styles.kycGateDesc}>
                  {kycRecord?.completedSteps?.includes(1)
                    ? "Your Step 1 details are saved. Once all 7 verification stages are completed and approved by Admin, you will be able to create child accounts and manage members."
                    : "Complete Step 1 (Basic Details) below to start your partner verification."}
                </Text>
              </View>

              <View style={styles.teamActionsRow}>
                <TouchableOpacity
                  style={styles.kycGateLockedBtn}
                  onPress={() =>
                    Alert.alert(
                      "Feature Locked",
                      "Creating subordinate accounts is locked until all 7 KYC verification steps are completed and approved by Admin.",
                      [{ text: "OK" }]
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="lock-closed" size={15} color="#94A3B8" />
                  <Text style={styles.kycGateLockedBtnText}>Add Member</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kycGateLockedBtn}
                  onPress={() =>
                    Alert.alert(
                      "Feature Locked",
                      "Viewing and managing your team is locked until your KYC is verified and approved by Admin.",
                      [{ text: "OK" }]
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="lock-closed" size={15} color="#94A3B8" />
                  <Text style={styles.kycGateLockedBtnText}>View My Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : null}

        {/* KYC Onboarding Progress - Guided Spotlight 7 Steps */}
        <KycVerificationFlow
          userId={user?.id}
          onKycUpdated={(updated) => setKycRecord(updated)}
        />

        {/* Account & Profile Action */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(user)/profile" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#F0F9FF" }]}>
            <Ionicons name="person-circle" size={22} color="#0284C7" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>My Profile & Security</Text>
            <Text style={styles.actionDesc}>
              Partner ID, business details, KYC status & change password
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    width: "100%",
  },
  logoImage: {
    width: "100%",
    maxWidth: 320,
    height: 155,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  roleBadge: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileViewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  profileViewBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  kycCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  kycHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  kycStepBadge: {
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kycStepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
  },
  kycStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue,
  },
  stepsList: {
    gap: 4,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepActive: {
    backgroundColor: colors.blue,
  },
  stepPending: {
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  stepDesc: {
    fontSize: 11,
    color: colors.muted,
  },
  stepDivider: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 12,
    marginVertical: 2,
  },
  servicesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  serviceItem: {
    alignItems: "center",
    width: "22%",
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 14,
    height: 50,
    backgroundColor: colors.bg,
    gap: 8,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "600",
  },
  teamCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  teamHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  teamCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  teamCardSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  rolesCountBadge: {
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolesCountBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.blue,
  },
  teamActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  teamPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  teamPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  teamSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightBlue,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  teamSecondaryBtnText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  approvedBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  kycGateCard: {
    backgroundColor: "#FFFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    marginBottom: 24,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kycGateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  kycGateIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  kycGateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  kycGateSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  kycGatePhaseBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  kycGatePhaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  kycGatePhaseBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  kycGateDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  kycGateLockedBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 6,
  },
  kycGateLockedBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
