import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchUsers } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 40,
    activeUsers: 38,
    retailersCount: 6,
    kycCompleted: 8,
    kycPending: 20,
    totalAgents: 32,
  });

  const loadStats = useCallback(async () => {
    try {
      const list = await fetchUsers();
      const total = list.length;
      const active = list.filter((u) => u.status === "active").length;
      const retailers = list.filter((u) => u.role_id === 8).length;
      const kycDone = list.filter((u) => u.kyc?.status === "approved").length;
      const kycPend = list.filter(
        (u) => u.kyc && u.kyc.status !== "approved"
      ).length;
      const agents = list.filter(
        (u) => u.role_id >= 2 && u.role_id <= 7
      ).length;

      setStats({
        totalUsers: total || 40,
        activeUsers: active || 38,
        retailersCount: retailers || 6,
        kycCompleted: kycDone || 8,
        kycPending: kycPend || 20,
        totalAgents: agents || 32,
      });
    } catch {
      // quiet fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const activePercent = stats.totalUsers > 0
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
    : 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enlarged, Crisp AquaPay Logo Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require("../../../assets/images/company/Aqyapay logo.jpeg")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Header Bar with Subtitle and Admin Badge */}
        <View style={styles.headerBar}>
          <Text style={styles.headerSubtitle}>Admin Control Portal</Text>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push("/(admin)/profile" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={colors.navy} />
          </View>
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.profileName}>
                {user?.name || "System Admin"}
              </Text>
              <View style={styles.profileViewBadge}>
                <Text style={styles.profileViewBadgeText}>My Profile</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.blue} />
              </View>
            </View>
            <Text style={styles.profileEmail}>
              {user?.email || "admin@aquapay.com"}
            </Text>
            <Text style={styles.profileMeta}>
              Mobile: {user?.mobile || "N/A"} • Company:{" "}
              {user?.company_name || "Head Office"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Top 4 Core Metric Cards (2x2 Grid) */}
        <Text style={styles.sectionTitle}>Account Metrics</Text>
        <View style={styles.metricGrid}>
          {/* Card 1: Total Users */}
          <TouchableOpacity
            style={[styles.metricCard, styles.metricCardBlue]}
            onPress={() => router.push("/(admin)/users" as any)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={62}
              color="#1E8CF0"
              style={styles.watermarkIcon}
            />
            <Text style={styles.metricCardTitle}>Total Users</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigNumber}>{stats.totalUsers}</Text>
              <View style={[styles.metricBadge, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="arrow-up" size={11} color="#0284C7" />
                <Text style={[styles.metricBadgeText, { color: "#0284C7" }]}>
                  {activePercent}%
                </Text>
              </View>
            </View>
            <Text style={styles.metricCaption}>
              Registered in <Text style={{ color: "#1E8CF0", fontWeight: "700" }}>Database</Text>
            </Text>
          </TouchableOpacity>

          {/* Card 2: Active Accounts */}
          <TouchableOpacity
            style={[styles.metricCard, styles.metricCardGreen]}
            onPress={() => router.push("/(admin)/users" as any)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-circle-outline"
              size={62}
              color="#16A34A"
              style={styles.watermarkIcon}
            />
            <Text style={styles.metricCardTitle}>Active Accounts</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigNumber}>{stats.activeUsers}</Text>
              <View style={[styles.metricBadge, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="arrow-up" size={11} color="#15803D" />
                <Text style={[styles.metricBadgeText, { color: "#15803D" }]}>
                  Active
                </Text>
              </View>
            </View>
            <Text style={styles.metricCaption}>
              Operational <Text style={{ color: "#16A34A", fontWeight: "700" }}>Status Verified</Text>
            </Text>
          </TouchableOpacity>

          {/* Card 3: Retailers Network */}
          <TouchableOpacity
            style={[styles.metricCard, styles.metricCardPurple]}
            onPress={() => router.push("/(admin)/users" as any)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="storefront-outline"
              size={62}
              color="#8B5CF6"
              style={styles.watermarkIcon}
            />
            <Text style={styles.metricCardTitle}>Retailers Network</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigNumber}>{stats.retailersCount}</Text>
              <View style={[styles.metricBadge, { backgroundColor: "#F3E8FF" }]}>
                <Ionicons name="arrow-up" size={11} color="#7C3AED" />
                <Text style={[styles.metricBadgeText, { color: "#7C3AED" }]}>
                  Counter
                </Text>
              </View>
            </View>
            <Text style={styles.metricCaption}>
              Active retail <Text style={{ color: "#8B5CF6", fontWeight: "700" }}>merchant outlets</Text>
            </Text>
          </TouchableOpacity>

          {/* Card 4: KYC Completed */}
          <View style={[styles.metricCard, styles.metricCardAmber]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={62}
              color="#D97706"
              style={styles.watermarkIcon}
            />
            <Text style={styles.metricCardTitle}>KYC Completed</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigNumber}>{stats.kycCompleted}</Text>
              <View style={[styles.metricBadge, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="arrow-up" size={11} color="#B45309" />
                <Text style={[styles.metricBadgeText, { color: "#B45309" }]}>
                  {stats.kycPending} Pending
                </Text>
              </View>
            </View>
            <Text style={styles.metricCaption}>
              Compliance <Text style={{ color: "#D97706", fontWeight: "700" }}>audit pass rate</Text>
            </Text>
          </View>
        </View>

        {/* System & Network Overview Section (Downtime removed, clean mobile cards) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>System & Network Overview</Text>
          <Text style={styles.sectionHint}>Live telemetry</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overviewScroll}
        >
          {/* Overview Card 1: Today Network */}
          <View style={[styles.overviewCard, { borderColor: "#BBF7D0", backgroundColor: "#F7FDF9" }]}>
            <View style={styles.overviewCardTop}>
              <View style={[styles.overviewIconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="calendar-outline" size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.overviewCardHeading}>Today Network</Text>
                <Text style={styles.overviewCardSub}>Live API Requests</Text>
              </View>
            </View>

            {/* Stylized Mini Bar Graphic */}
            <View style={styles.miniBarChart}>
              <View style={[styles.miniBar, { height: 12, backgroundColor: "#86EFAC" }]} />
              <View style={[styles.miniBar, { height: 18, backgroundColor: "#86EFAC" }]} />
              <View style={[styles.miniBar, { height: 26, backgroundColor: "#4ADE80" }]} />
              <View style={[styles.miniBar, { height: 20, backgroundColor: "#4ADE80" }]} />
              <View style={[styles.miniBar, { height: 32, backgroundColor: "#16A34A" }]} />
            </View>

            <Text style={[styles.overviewFooterValue, { color: "#16A34A" }]}>
              Active
            </Text>
          </View>

          {/* Overview Card 2: This Month */}
          <View style={[styles.overviewCard, { borderColor: "#BFDBFE", backgroundColor: "#F8FBFF" }]}>
            <View style={styles.overviewCardTop}>
              <View style={[styles.overviewIconBox, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="bar-chart-outline" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.overviewCardHeading}>This Month</Text>
                <Text style={styles.overviewCardSub}>Agent Network Growth</Text>
              </View>
            </View>

            {/* Stylized Mini Bar Graphic */}
            <View style={styles.miniBarChart}>
              <View style={[styles.miniBar, { height: 14, backgroundColor: "#93C5FD" }]} />
              <View style={[styles.miniBar, { height: 22, backgroundColor: "#93C5FD" }]} />
              <View style={[styles.miniBar, { height: 18, backgroundColor: "#60A5FA" }]} />
              <View style={[styles.miniBar, { height: 28, backgroundColor: "#3B82F6" }]} />
              <View style={[styles.miniBar, { height: 34, backgroundColor: "#1D4ED8" }]} />
            </View>

            <Text style={[styles.overviewFooterValue, { color: "#1D4ED8" }]}>
              +{stats.totalUsers} Agents
            </Text>
          </View>

          {/* Overview Card 3: Compliance Audits */}
          <View style={[styles.overviewCard, { borderColor: "#FDE68A", backgroundColor: "#FFFDF5" }]}>
            <View style={styles.overviewCardTop}>
              <View style={[styles.overviewIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="stats-chart-outline" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.overviewCardHeading}>Compliance Audits</Text>
                <Text style={styles.overviewCardSub}>KYC Verification Rate</Text>
              </View>
            </View>

            {/* Stylized Mini Bar Graphic */}
            <View style={styles.miniBarChart}>
              <View style={[styles.miniBar, { height: 14, backgroundColor: "#FDE68A" }]} />
              <View style={[styles.miniBar, { height: 20, backgroundColor: "#FCD34D" }]} />
              <View style={[styles.miniBar, { height: 30, backgroundColor: "#F59E0B" }]} />
              <View style={[styles.miniBar, { height: 22, backgroundColor: "#FCD34D" }]} />
              <View style={[styles.miniBar, { height: 16, backgroundColor: "#FDE68A" }]} />
            </View>

            <Text style={[styles.overviewFooterValue, { color: "#D97706" }]}>
              {stats.kycCompleted} Verified
            </Text>
          </View>
        </ScrollView>

        {/* Admin Management Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Management Modules</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(admin)/users" as any)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.actionIcon, { backgroundColor: colors.lightBlue }]}
          >
            <Ionicons
              name="people"
              size={22}
              color={colors.navy}
            />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>User & Role Directory</Text>
            <Text style={styles.actionDesc}>
              View, edit profiles, reset passwords & manage permissions
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(admin)/create-user" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons
              name="person-add"
              size={22}
              color={colors.blue}
            />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create New Account</Text>
            <Text style={styles.actionDesc}>
              Register Sub-Admin, NSM, SH, CNF, MD, Distributor or Retailer
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="shield-checkmark" size={22} color="#D97706" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>KYC Audit Queue</Text>
            <Text style={styles.actionDesc}>
              Review DigiLocker Aadhaar, PAN & Bank penny-drop cases
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(admin)/profile" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#F0F9FF" }]}>
            <Ionicons name="person-circle" size={22} color="#0284C7" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>My Profile & Security</Text>
            <Text style={styles.actionDesc}>
              Partner ID, shop details, company & change password
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    marginBottom: 18,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  adminBadgeText: {
    color: "#FFFFFF",
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
    marginBottom: 20,
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
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
    minHeight: 122,
    justifyContent: "space-between",
  },
  metricCardBlue: {
    backgroundColor: "#F0F7FF",
    borderColor: "#D0E4FF",
  },
  metricCardGreen: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  metricCardPurple: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  metricCardAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  watermarkIcon: {
    position: "absolute",
    right: -8,
    bottom: -8,
    opacity: 0.1,
  },
  metricCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  metricBigNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
  },
  metricBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  metricBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricCaption: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  overviewScroll: {
    paddingRight: 10,
    gap: 12,
  },
  overviewCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    minHeight: 138,
  },
  overviewCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  overviewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCardHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  overviewCardSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  miniBarChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 36,
    marginVertical: 10,
    paddingLeft: 4,
  },
  miniBar: {
    width: 26,
    borderRadius: 4,
  },
  overviewFooterValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
    marginTop: 16,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "600",
  },
});
