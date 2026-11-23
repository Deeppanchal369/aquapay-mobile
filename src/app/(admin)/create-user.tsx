import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [mobileStatus, setMobileStatus] = useState<"idle" | "available" | "taken">("idle");
  const [mobileMessage, setMobileMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoadingRoles(true);
        const list = await fetchDescendantRoles();
        setRoles(list);
        if (list.length > 0) {
          setSelectedRoleId(list[0].id);
        }
      } catch {
        Alert.alert("Error", "Failed to fetch assignable roles");
      } finally {
        setLoadingRoles(false);
      }
    }
    loadRoles();
  }, []);

  const handleMobileChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setMobile(cleaned);
    setErrorMessage("");

    if (cleaned.length === 10) {
      try {
        setCheckingMobile(true);
        const res = await checkAvailability({ mobile: cleaned });
        if (res.available) {
          setMobileStatus("available");
          setMobileMessage("Mobile number verified & available");
        } else {
          setMobileStatus("taken");
          setMobileMessage(res.message || "This mobile number is already registered.");
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
    if (!name.trim()) {
      setErrorMessage("Please enter full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    if (mobileStatus === "taken") {
      setErrorMessage("Please use an unregistered mobile number.");
      return;
    }

    // Default password to verified mobile number if left empty by admin
    const effectivePassword = password.trim() ? password.trim() : cleanMobile;
    if (effectivePassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    try {
      setBusy(true);
      await createUser({
        roleId: selectedRoleId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        password: effectivePassword,
        shopname: shopname.trim() || undefined,
        address: address.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      const passNote = password.trim()
        ? "Custom password configured."
        : `Default password set to mobile number (${cleanMobile}).`;

      Alert.alert(
        "User Created Successfully",
        `New account for ${name.trim()} has been created. ${passNote}`,
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
            <Text style={styles.headerTitle}>Create New User</Text>
            <Text style={styles.headerSubtitle}>Assign role & merchant profile</Text>
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
          <Text style={styles.sectionLabel}>Select Role *</Text>
          {loadingRoles ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 10 }} />
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

          <Text style={styles.inputLabel}>Mobile Number *</Text>
          <View
            style={[
              styles.inputContainer,
              mobileStatus === "available" && styles.inputSuccess,
              mobileStatus === "taken" && styles.inputError,
            ]}
          >
            <Ionicons name="call-outline" size={20} color={colors.muted} style={styles.inputIcon} />
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

          {/* Inline Mobile Status Feedback */}
          {mobileStatus === "available" ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.feedbackSuccessText}>
                Mobile verified & available. Default password: {mobile}
              </Text>
            </View>
          ) : mobileStatus === "taken" ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.feedbackErrorText}>{mobileMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. rahul@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>
            Custom Password <Text style={styles.optionalText}>(Optional - Defaults to Mobile)</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={mobile ? `Default: ${mobile}` : "Leave blank to use mobile number"}
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
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
          </View>
          <Text style={styles.helperText}>
            If left blank, the verified 10-digit mobile number is automatically set as the initial password.
          </Text>

          {/* Business & Address Details */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Shop / Business Details (Optional)</Text>

          <Text style={styles.inputLabel}>Shop or Enterprise Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="storefront-outline" size={20} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Sharma Telecom"
              placeholderTextColor={colors.muted}
              value={shopname}
              onChangeText={setShopname}
            />
          </View>

          <Text style={styles.inputLabel}>Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.muted} style={styles.inputIcon} />
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
            <Ionicons name="navigate-outline" size={20} color={colors.muted} style={styles.inputIcon} />
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
              (busy || mobileStatus === "taken") && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={busy || mobileStatus === "taken"}
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
  optionalText: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.muted,
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
  eyeBtn: {
    padding: 6,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  feedbackSuccessText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  feedbackErrorText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    paddingHorizontal: 4,
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
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
