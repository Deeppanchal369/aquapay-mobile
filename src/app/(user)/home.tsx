import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Bar: Brand Logo & Sign Out */}
        <View style={styles.topBar}>
          <Image
            source={require("../../../assets/images/company/Aqyapay logo.jpeg")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Clean Welcome Header */}
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Welcome, {user?.name || "Partner"}</Text>
          <Text style={styles.welcomeSubtitle}>Complete your KYC verification</Text>
        </View>

        {/* Hierarchy Network (Shown ONLY when KYC is approved by Admin) */}
        {descendantRoles.length > 0 && kycRecord?.status === "approved" ? (
          <View style={styles.teamCard}>
            <View style={styles.teamHeaderRow}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.teamCardTitle}>Hierarchy Network</Text>
                  <View style={styles.approvedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                    <Text style={styles.approvedBadgeText}>APPROVED</Text>
                  </View>
                </View>
                <Text style={styles.teamCardSubtitle}>
                  {teamCount !== null
                    ? `${teamCount} member${teamCount === 1 ? "" : "s"} created`
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
                <Ionicons name="person-add" size={15} color="#FFFFFF" />
                <Text style={styles.teamPrimaryBtnText}>Add Member</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.teamSecondaryBtn}
                onPress={() => router.push("/(user)/team" as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={15} color={colors.navy} />
                <Text style={styles.teamSecondaryBtnText}>View Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 7-Step KYC Flow */}
        <KycVerificationFlow
          userId={user?.id}
          onKycUpdated={(updated) => setKycRecord(updated)}
        />
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
    paddingVertical: 14,
    paddingBottom: 40,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoImage: {
    width: 140,
    height: 48,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  welcomeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  teamCardTitle: {
    fontSize: 15,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  rolesCountBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.blue,
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  approvedBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "800",
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
    paddingVertical: 10,
    borderRadius: 8,
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
    paddingVertical: 10,
    borderRadius: 8,
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
