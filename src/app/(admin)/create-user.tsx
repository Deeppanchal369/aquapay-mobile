import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  checkAvailability,
  createUser,
  fetchDescendantRoles,
  RoleItem,
} from "../../api/users";
import StatusModal from "../../components/StatusModal";
import { colors } from "../../theme/colors";

export default function AdminCreateUserScreen() {
  const router = useRouter();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Form State
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shopname, setShopname] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Live Mobile Verification State
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<
    "idle" | "available" | "taken"
  >("idle");
  const [mobileMessage, setMobileMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [successModalData, setSuccessModalData] = useState<{
    visible: boolean;
    name: string;
    role: string;
    identifier: string;
    password?: string;
  } | null>(null);

  const scrollViewRef = useRef<any>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardPadding(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoadingRoles(true);
        const list = await fetchDescendantRoles();
        setRoles(list);
        if (list.length > 0) {
          setSelectedRoleId(list[0].id);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          Alert.alert(
            "Session Expired",
            "Your login session has expired. Please sign in again to continue.",
            [{ text: "Sign In", onPress: () => router.replace("/login") }]
          );
        } else {
          Alert.alert(
            "Error",
            err?.response?.data?.message || err?.message || "Failed to fetch assignable roles"
          );
        }
      } finally {
        setLoadingRoles(false);
      }
    }
    loadRoles();
  }, [router]);

  const handleMobileChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setMobile(cleaned);
    setErrorMessage("");

    // If mobile number changed, reset password to locked state
    setPassword("");

    if (cleaned.length === 10) {
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        setMobileStatus("taken");
        setMobileMessage("Indian mobile numbers must start with 6, 7, 8, or 9.");
        return;
      }

      try {
        setCheckingMobile(true);
        const res = await checkAvailability({ mobile: cleaned });
        if (res.available) {
          setMobileStatus("available");
          setMobileMessage("Mobile number verified & available");
          // Automatically pre-fill password with the verified mobile number
          setPassword(cleaned);
        } else {
          setMobileStatus("taken");
          setMobileMessage(
            res.message || "This mobile number is already registered in AquaPay.",
          );
        }
      } catch {
        setMobileStatus("idle");
        setMobileMessage("");
      } finally {
        setCheckingMobile(false);
      }
    } else {
      setMobileStatus("idle");
      setMobileMessage("");
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!selectedRoleId) {
      setErrorMessage("Please select a user role.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter full name.");
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMessage("Full name must be between 2 and 100 characters.");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      setErrorMessage("Full name must contain only alphabetic letters and spaces.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage("Please enter a complete 10-digit mobile number.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Mobile number must start with 6, 7, 8, or 9.");
      return;
    }

    if (mobileStatus !== "available") {
      setErrorMessage(
        "Please enter an available, unregistered mobile number to continue.",
      );
      return;
    }

    // Default password to verified mobile number if left empty by admin
    const effectivePassword = password.trim() ? password.trim() : cleanMobile;
    if (effectivePassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    const cleanPincode = pincode.trim();
    if (cleanPincode && !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      setErrorMessage("Pincode must be a valid 6-digit postal code (e.g. 400001).");
      return;
    }

    try {
      setBusy(true);
      await createUser({
        roleId: selectedRoleId,
        name: trimmedName,
        email: cleanEmail,
        mobile: cleanMobile,
        password: effectivePassword,
        shopname: shopname.trim() || undefined,
        address: address.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        pincode: cleanPincode || undefined,
      });

      const roleName =
        roles.find((r) => r.id === selectedRoleId)?.name || "Member";

      setSuccessModalData({
        visible: true,
        name: trimmedName,
        role: roleName,
        identifier: cleanMobile,
        password: effectivePassword,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not create user. Check if email/mobile is already registered.";
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const isPasswordUnlocked = mobileStatus === "available";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.navy} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Create New User</Text>
            <Text style={styles.headerSubtitle}>
              Assign role & merchant profile
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardPadding > 0 ? keyboardPadding + 50 : 50 },
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Error Banner */}
          {Boolean(errorMessage) && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Role Picker Section */}
          <Text style={styles.sectionLabel}>Select Role *</Text>
          {loadingRoles ? (
            <ActivityIndicator
              color={colors.blue}
              style={{ marginVertical: 10 }}
            />
          ) : (
            <View style={styles.roleGrid}>
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleOption,
                      isSelected && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedRoleId(r.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={isSelected ? "#FFFFFF" : colors.muted}
                    />
                    <Text
                      style={[
                        styles.roleOptionText,
                        isSelected && styles.roleOptionTextActive,
                      ]}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Account Credentials */}
          <Text style={styles.sectionLabel}>Account Credentials</Text>

          {/* Mobile Number Input with Live Verification */}
          <Text style={styles.inputLabel}>Mobile Number *</Text>
          <View
            style={[
              styles.inputContainer,
              mobileStatus === "available" && styles.inputSuccess,
              mobileStatus === "taken" && styles.inputError,
            ]}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile (e.g. 9876543210)"
              placeholderTextColor={colors.muted}
              value={mobile}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!busy}
            />
            {checkingMobile ? (
              <ActivityIndicator size="small" color={colors.blue} />
            ) : mobileStatus === "available" ? (
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            ) : mobileStatus === "taken" ? (
              <Ionicons name="close-circle" size={20} color={colors.error} />
            ) : null}
          </View>

          {/* Inline Mobile Status Feedback */}
          {mobileStatus === "available" ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.feedbackSuccessText}>
                Mobile verified & available. Password unlocked & auto-filled with: {mobile}
              </Text>
            </View>
          ) : mobileStatus === "taken" ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.feedbackErrorText}>{mobileMessage}</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Step 1: Enter 10-digit mobile number to verify availability before password setup.
            </Text>
          )}

          {/* Password Input: Only Unlocked Once Mobile is Verified */}
          <View style={styles.passwordLabelRow}>
            <Text style={styles.inputLabel}>
              Initial Password *{" "}
              {isPasswordUnlocked ? (
                <Text style={styles.optionalText}>(Defaults to Mobile)</Text>
              ) : null}
            </Text>
            {!isPasswordUnlocked ? (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color={colors.muted} />
                <Text style={styles.lockBadgeText}>Locked</Text>
              </View>
            ) : (
              <View style={[styles.lockBadge, styles.unlockedBadge]}>
                <Ionicons name="lock-open" size={12} color="#15803D" />
                <Text style={styles.unlockedBadgeText}>Unlocked</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.inputContainer,
              !isPasswordUnlocked && styles.inputDisabled,
            ]}
          >
            <Ionicons
              name={isPasswordUnlocked ? "lock-open-outline" : "lock-closed-outline"}
              size={20}
              color={isPasswordUnlocked ? colors.blue : colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, !isPasswordUnlocked && styles.inputTextDisabled]}
              placeholder={
                isPasswordUnlocked
                  ? `Default: ${mobile}`
                  : "Verify mobile number above first"
              }
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={isPasswordUnlocked && !busy}
            />
            {isPasswordUnlocked ? (
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.helperText}>
            {!isPasswordUnlocked
              ? "Password field remains safely locked until an unregistered mobile number is verified."
              : `Default password is pre-filled with ${mobile}. As Admin, you may keep it or enter a custom password (min 8 chars).`}
          </Text>

          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma (letters only)"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              editable={!busy}
            />
          </View>

          {/* Email Address */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. rahul@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!busy}
            />
          </View>

          {/* Business & Address Details */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Shop / Business Details (Optional)
          </Text>

          <Text style={styles.inputLabel}>Shop or Enterprise Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="storefront-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Sharma Telecom"
              placeholderTextColor={colors.muted}
              value={shopname}
              onChangeText={setShopname}
              editable={!busy}
            />
          </View>

          <Text style={styles.inputLabel}>Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Shop / Building, Street"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
              editable={!busy}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={colors.muted}
                  value={city}
                  onChangeText={setCity}
                  editable={!busy}
                />
              </View>
            </View>
            <View style={styles.rowCol}>
              <Text style={styles.inputLabel}>State</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={colors.muted}
                  value={state}
                  onChangeText={setState}
                  editable={!busy}
                />
              </View>
            </View>
          </View>

          <Text style={styles.inputLabel}>Pincode</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="navigate-outline"
              size={20}
              color={colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="6-digit postal PIN"
              placeholderTextColor={colors.muted}
              value={pincode}
              onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isPasswordUnlocked || busy) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isPasswordUnlocked || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create User Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {successModalData ? (
        <StatusModal
          visible={successModalData.visible}
          type="success"
          title="Account Created!"
          message={`New partner account for ${successModalData.name} has been successfully registered.`}
          credentials={{
            name: successModalData.name,
            role: successModalData.role,
            identifier: successModalData.identifier,
            password: successModalData.password,
          }}
          note="They can immediately sign in using their mobile number and this default password."
          primaryButtonText="Go to User Directory"
          onPrimaryPress={() => {
            setSuccessModalData(null);
            router.back();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 40,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 12,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  roleOptionActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  roleOptionTextActive: {
    color: "#FFFFFF",
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 6,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  unlockedBadge: {
    backgroundColor: "#DCFCE7",
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "400",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  inputDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  inputTextDisabled: {
    color: colors.muted,
  },
  inputSuccess: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  feedbackSuccessText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  feedbackErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  helperText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 5,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowCol: {
    flex: 1,
  },
  eyeBtn: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: colors.blue,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
