import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { changePassword, fetchMyProfile, UserProfile } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

interface Props {
  role: "admin" | "user";
}

export default function UserProfileView({ role }: Props) {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await fetchMyProfile();
      if (data) {
        setProfile(data);
      }
    } catch {
      // quiet fallback to auth user context
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshProfile().catch(() => {});
    loadData();
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordBusy(true);

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(res?.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password. Please verify your current password.";
      setPasswordError(msg);
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of AquaPay?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const activeUser = profile || user;
  const initial = (activeUser?.name || "User").charAt(0).toUpperCase();

  const formattedDate = (rawDate?: string) => {
    if (!rawDate) return "Not provided";
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return "Not provided";
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Not provided";
    }
  };

  const cityState = [activeUser?.city, activeUser?.state]
    .filter(Boolean)
    .join(", ");

  const kycStatus = activeUser?.kyc?.status || "pending";
  const isKycApproved = kycStatus === "approved" || kycStatus === "verified";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.navy} />
            </TouchableOpacity>

            <View style={styles.topBarTitleBox}>
              <Text style={styles.topBarTitle}>My Profile</Text>
              <Text style={styles.topBarSubtitle}>
                {role === "admin" ? "Admin Account Overview" : "Member Profile"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="reload" size={18} color={colors.blue} />
            </TouchableOpacity>
          </View>

          {/* AquaPay Header Logo */}
          <View style={styles.brandContainer}>
            <Image
              source={require("../../assets/images/company/Aqyapay logo.jpeg")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {loading && !profile ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.blue} />
              <Text style={styles.loadingText}>Loading profile details...</Text>
            </View>
          ) : (
            <>
              {/* Profile Card (Matches Image 1) */}
              <View style={styles.profileCard}>
                {/* Top Section: Avatar, Name, Partner ID, Status, KYC Badge */}
                <View style={styles.profileHeaderRow}>
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>

                  <View style={styles.profileMetaInfo}>
                    <Text style={styles.profileName}>
                      {activeUser?.name || "Admin"}
                    </Text>
                    <Text style={styles.partnerIdText}>
                      Partner ID: #{activeUser?.id || "—"} ·{" "}
                      {activeUser?.role_name || (role === "admin" ? "Admin" : "Member")}
                    </Text>
                    <Text style={styles.accountStatusText}>
                      Account:{" "}
                      <Text style={{ fontWeight: "700", color: "#16A34A" }}>
                        {activeUser?.status || "active"}
                      </Text>
                    </Text>
                  </View>

                  {/* KYC Pill Badge */}
                  <View
                    style={[
                      styles.kycBadge,
                      isKycApproved
                        ? styles.kycBadgeApproved
                        : styles.kycBadgePending,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={15}
                      color={isKycApproved ? "#15803D" : "#0284C7"}
                    />
                    <Text
                      style={[
                        styles.kycBadgeText,
                        isKycApproved
                          ? styles.kycTextApproved
                          : styles.kycTextPending,
                      ]}
                    >
                      KYC: {kycStatus}
                    </Text>
                  </View>
                </View>

                {/* Divider Line */}
                <View style={styles.cardDivider} />

                {/* 2-Column Responsive Detail Grid */}
                <View style={styles.detailsGrid}>
                  {/* Row 1 */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="mail-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Email Address</Text>
                      </View>
                      <Text style={styles.gridValue} numberOfLines={1}>
                        {activeUser?.email || "Not provided"}
                      </Text>
                    </View>

                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="call-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Mobile Number</Text>
                      </View>
                      <Text style={styles.gridValue}>
                        {activeUser?.mobile || "Not provided"}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="storefront-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Business / Shop</Text>
                      </View>
                      <Text style={styles.gridValue} numberOfLines={1}>
                        {activeUser?.shopname || "Not provided"}
                      </Text>
                    </View>

                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Operating Address</Text>
                      </View>
                      <Text style={styles.gridValue} numberOfLines={1}>
                        {activeUser?.address || "Not provided"}
                      </Text>
                    </View>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>City / State</Text>
                      </View>
                      <Text style={styles.gridValue}>
                        {cityState || "Not provided"}
                      </Text>
                    </View>

                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="person-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Parent / Sponsor</Text>
                      </View>
                      <Text style={styles.gridValue} numberOfLines={1}>
                        {activeUser?.parent_name || "Not provided"}
                      </Text>
                    </View>
                  </View>

                  {/* Row 4 */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="shield-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Company</Text>
                      </View>
                      <Text style={styles.gridValue}>
                        {activeUser?.company_name || "AQUAPAY"}
                      </Text>
                    </View>

                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>Account Created</Text>
                      </View>
                      <Text style={styles.gridValue}>
                        {formattedDate(activeUser?.created_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Row 5 */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <View style={styles.labelWithIcon}>
                        <Ionicons
                          name="briefcase-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text style={styles.gridLabel}>
                          Business Constitution
                        </Text>
                      </View>
                      <Text style={styles.gridValue}>
                        {activeUser?.kyc?.business_type || "Not provided"}
                      </Text>
                    </View>
                    <View style={styles.gridCol} />
                  </View>
                </View>
              </View>

              {/* Change Password Card (Matches Image 2) */}
              <View style={styles.passwordCard}>
                <View style={styles.passwordHeaderRow}>
                  <Ionicons name="key-outline" size={20} color="#0284C7" />
                  <Text style={styles.passwordHeaderTitle}>Change Password</Text>
                </View>

                {/* Alerts */}
                {Boolean(passwordError) && (
                  <View style={styles.errorAlert}>
                    <Ionicons
                      name="alert-circle"
                      size={18}
                      color={colors.error}
                    />
                    <Text style={styles.errorAlertText}>{passwordError}</Text>
                  </View>
                )}

                {Boolean(passwordSuccess) && (
                  <View style={styles.successAlert}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#16A34A"
                    />
                    <Text style={styles.successAlertText}>{passwordSuccess}</Text>
                  </View>
                )}

                <View style={styles.passwordForm}>
                  {/* Current Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Current password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.fieldInput}
                        value={currentPassword}
                        onChangeText={(val) => {
                          setCurrentPassword(val);
                          if (passwordError) setPasswordError("");
                        }}
                        secureTextEntry={!showCurrentPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!passwordBusy}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword((prev) => !prev)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={
                            showCurrentPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={18}
                          color={colors.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>New password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.fieldInput}
                        value={newPassword}
                        onChangeText={(val) => {
                          setNewPassword(val);
                          if (passwordError) setPasswordError("");
                        }}
                        secureTextEntry={!showNewPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!passwordBusy}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword((prev) => !prev)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={
                            showNewPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={18}
                          color={colors.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Confirm new password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.fieldInput}
                        value={confirmPassword}
                        onChangeText={(val) => {
                          setConfirmPassword(val);
                          if (passwordError) setPasswordError("");
                        }}
                        secureTextEntry={!showConfirmPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!passwordBusy}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={18}
                          color={colors.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Change Password Button */}
                  <TouchableOpacity
                    style={[
                      styles.changePasswordBtn,
                      passwordBusy && styles.btnDisabled,
                    ]}
                    onPress={handlePasswordSubmit}
                    disabled={passwordBusy}
                    activeOpacity={0.85}
                  >
                    {passwordBusy ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.changePasswordBtnText}>
                        Change Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={styles.logoutBtnText}>Sign Out of AquaPay</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topBarTitleBox: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  logoImage: {
    width: 220,
    height: 60,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },

  // Profile Card Styles (Matches Image 1)
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  profileMetaInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  partnerIdText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 1,
  },
  accountStatusText: {
    fontSize: 12,
    color: "#64748B",
  },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  kycBadgePending: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  kycBadgeApproved: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  kycTextPending: {
    color: "#0284C7",
  },
  kycTextApproved: {
    color: "#15803D",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  detailsGrid: {
    gap: 14,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Change Password Card Styles (Matches Image 2)
  passwordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  passwordHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  passwordHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorAlertText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  successAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  successAlertText: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  passwordForm: {
    gap: 12,
  },
  fieldGroup: {},
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 6,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  eyeBtn: {
    padding: 6,
  },
  changePasswordBtn: {
    backgroundColor: "#0284C7",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 22,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  changePasswordBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Logout Button
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 14,
    height: 48,
    backgroundColor: colors.bg,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
});
