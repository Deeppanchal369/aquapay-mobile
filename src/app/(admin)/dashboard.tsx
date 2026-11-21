import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

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

        {/* Header Bar with Subtitle and Admin Badge */}
        <View style={styles.headerBar}>
          <Text style={styles.headerSubtitle}>Admin Control Portal</Text>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={colors.navy} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name || "System Admin"}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || "admin@aquapay.com"}
            </Text>
            <Text style={styles.profileMeta}>
              Mobile: {user?.mobile || "N/A"} • Company:{" "}
              {user?.company_name || "Head Office"}
            </Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons
                name="documents-outline"
                size={22}
                color={colors.blue}
              />
            </View>
            <Text style={styles.statValue}>KYC Desk</Text>
            <Text style={styles.statLabel}>Aadhaar & PAN Cases</Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(admin)/users" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="people-outline" size={22} color={colors.purple} />
            </View>
            <Text style={styles.statValue}>Hierarchy</Text>
            <Text style={styles.statLabel}>Role Network</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Management Actions */}
        <Text style={styles.sectionTitle}>Management Modules</Text>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View
            style={[styles.actionIcon, { backgroundColor: colors.lightBlue }]}
          >
            <Ionicons
              name="finger-print-outline"
              size={22}
              color={colors.navy}
            />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>KYC Verification Queue</Text>
            <Text style={styles.actionDesc}>
              Review customer documents and verification status
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(admin)/users" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons
              name="git-network-outline"
              size={22}
              color={colors.blue}
            />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Distributor & Retailer Accounts
            </Text>
            <Text style={styles.actionDesc}>
              Manage merchant hierarchy and assigned roles
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="card-outline" size={22} color="#D97706" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Bank Account Verifications</Text>
            <Text style={styles.actionDesc}>
              Inspect penny-drop and bank registration status
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
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    marginBottom: 24,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 17,
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
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
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
  systemStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 24,
    gap: 10,
  },
  systemStatusTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  systemStatusDesc: {
    fontSize: 11,
    color: colors.muted,
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
});
