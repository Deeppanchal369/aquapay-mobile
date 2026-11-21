import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDescendantRoles, fetchUsers, RoleItem } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [descendantRoles, setDescendantRoles] = useState<RoleItem[]>([]);
  const [teamCount, setTeamCount] = useState<number | null>(null);

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
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={26} color={colors.navy} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.greetingText}>Welcome,</Text>
            <Text style={styles.profileName}>{user?.name || "Member"}</Text>
            <Text style={styles.profileEmail}>
              {user?.email || "user@example.com"}
            </Text>
            <Text style={styles.profileMeta}>
              Mobile: {user?.mobile || "N/A"}{" "}
              {user?.shopname ? `• ${user.shopname}` : ""}
            </Text>
          </View>
        </View>

        {/* Subordinate Role: Team & Merchant Network (Only shown if role can create child users) */}
        {descendantRoles.length > 0 ? (
          <View style={styles.teamCard}>
            <View style={styles.teamHeaderRow}>
              <View>
                <Text style={styles.teamCardTitle}>Hierarchy Network</Text>
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
        ) : null}

        {/* KYC Onboarding Progress */}
        <Text style={styles.sectionTitle}>KYC Verification Journey</Text>
        <View style={styles.kycCard}>
          <View style={styles.kycHeaderRow}>
            <View style={styles.kycStepBadge}>
              <Text style={styles.kycStepBadgeText}>4 STEPS</Text>
            </View>
            <Text style={styles.kycStatusText}>In Progress</Text>
          </View>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  Step 1: Basic Details & OTP
                </Text>
                <Text style={styles.stepDesc}>
                  Mobile OTP challenge & identity initiation
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  Step 2: DigiLocker Verification
                </Text>
                <Text style={styles.stepDesc}>
                  Aadhaar & PAN document verification
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  Step 3: Bank Account Details
                </Text>
                <Text style={styles.stepDesc}>
                  Penny-drop validation and account linkage
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  Step 4: Live Selfie & Video
                </Text>
                <Text style={styles.stepDesc}>
                  Media capture for compliance audit
                </Text>
              </View>
            </View>
          </View>
        </View>

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
});
