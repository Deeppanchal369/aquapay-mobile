import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { colors } from "../../theme/colors";

export default function SubordinateCreateUserScreen() {
  const router = useRouter();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Form State
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
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

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoadingRoles(true);
        const list = await fetchDescendantRoles();
        if (list.length === 0) {
          Alert.alert(
            "Access Denied",
            "Your role is not authorized to create child accounts.",
            [{ text: "OK", onPress: () => router.back() }],
          );
          return;
        }
        setRoles(list);
        setSelectedRoleId(list[0].id);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          Alert.alert(
            "Session Expired",
            "Your login session has expired. Please sign in again to continue.",
            [{ text: "Sign In", onPress: () => router.replace("/login") }]
          );
        } else {
          Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to fetch assignable roles");
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
        } else {
          setMobileStatus("taken");
          setMobileMessage(
            res.message || "This mobile number is already registered.",
          );
        }
      } catch {
        setMobileStatus("idle");
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
      setErrorMessage("Please select a role");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter full name");
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMessage("Full name must be between 2 and 100 characters");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      setErrorMessage("Full name must contain only letters and spaces");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Mobile number must start with 6, 7, 8, or 9.");
      return;
    }
    if (mobileStatus === "taken") {
      setErrorMessage(
        "This mobile number is already registered. Please use a different number.",
      );
      return;
    }
    if (mobileStatus !== "available") {
      setErrorMessage(
        "Please enter an available, unregistered 10-digit mobile number.",
      );
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
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        password: cleanMobile, // Automatically locked to verified mobile number
        shopname: shopname.trim() || undefined,
        address: address.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      Alert.alert(
        "User Created Successfully",
        `New account for ${name.trim()} has been registered.\n\nDefault login password has been set to their mobile number (${cleanMobile}).`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
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
            <Text style={styles.headerTitle}>Add Network Member</Text>
            <Text style={styles.headerSubtitle}>
              Assign subordinate role under your hierarchy
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {Boolean(errorMessage) && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Role Picker Section */}
          <Text style={styles.sectionLabel}>Select Permitted Role *</Text>
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

          {/* Basic Details */}
          <Text style={styles.sectionLabel}>Account Credentials</Text>

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
              placeholder="e.g. Ramesh Patel"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

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
              placeholder="e.g. ramesh@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

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
              color={
                mobileStatus === "available"
                  ? "#16A34A"
                  : mobileStatus === "taken"
                    ? colors.error
                    : colors.muted
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.muted}
              value={mobile}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {checkingMobile ? (
              <ActivityIndicator size="small" color={colors.blue} />
            ) : mobileStatus === "available" ? (
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            ) : mobileStatus === "taken" ? (
              <Ionicons name="close-circle" size={20} color={colors.error} />
            ) : null}
          </View>

          {/* Mobile Verification Status Badge */}
          {checkingMobile ? (
            <View style={styles.mobileHelperRow}>
              <ActivityIndicator
                size="small"
                color={colors.blue}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.helperChecking}>
                Verifying mobile availability...
              </Text>
            </View>
          ) : mobileStatus === "available" ? (
            <View style={styles.mobileSuccessBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#15803D" />
              <Text style={styles.mobileSuccessText}>
                {mobileMessage || "Mobile verified & available."}
              </Text>
            </View>
          ) : mobileStatus === "taken" ? (
            <View style={styles.mobileErrorBadge}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.mobileErrorText}>
                {mobileMessage ||
                  "Mobile number is already registered with another user."}
              </Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Enter a 10-digit mobile number to verify and auto-generate default
              password.
            </Text>
          )}

          {/* Locked Auto-Generated Password Card */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            Default Login Password
          </Text>
          <View
            style={[
              styles.lockedPasswordCard,
              mobileStatus === "available" && styles.lockedPasswordCardActive,
            ]}
          >
            <View style={styles.lockedPasswordHeader}>
              <View
                style={[
                  styles.lockIconBox,
                  mobileStatus === "available" && {
                    backgroundColor: "#DCFCE7",
                  },
                ]}
              >
                <Ionicons
                  name={
                    mobileStatus === "available"
                      ? "lock-closed"
                      : "lock-closed-outline"
                  }
                  size={18}
                  color={
                    mobileStatus === "available" ? "#15803D" : colors.muted
                  }
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.lockedPasswordTitle}>
                  {mobileStatus === "available"
                    ? `Default Password: ${mobile}`
                    : "Auto-set to Mobile Number"}
                </Text>
                <Text style={styles.lockedPasswordDesc}>
                  {mobileStatus === "available"
                    ? "Initial login password is locked to this verified mobile number. Only administrators can change passwords."
                    : "Password will automatically be locked to the verified mobile number. Non-admin creators cannot set custom passwords."}
                </Text>
              </View>
            </View>
          </View>

          {/* Business & Address Details */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Merchant Details (Optional)
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
              placeholder="e.g. Patel Provision Store"
              placeholderTextColor={colors.muted}
              value={shopname}
              onChangeText={setShopname}
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
              placeholder="6-digit PIN"
              placeholderTextColor={colors.muted}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (busy || mobileStatus !== "available") &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={busy || mobileStatus !== "available"}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create User Account</Text>
            )}
          </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    marginBottom: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.lightBlue,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
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
    fontSize: 15,
    color: colors.text,
  },
  mobileHelperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 4,
  },
  helperChecking: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: "500",
  },
  mobileSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  mobileSuccessText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },
  mobileErrorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  mobileErrorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 5,
    marginLeft: 4,
  },
  lockedPasswordCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  lockedPasswordCardActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  lockedPasswordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedPasswordTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  lockedPasswordDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowCol: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: "700",
  },
});
