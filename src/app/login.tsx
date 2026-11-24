import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestPasswordReset, resetPassword } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Forgot Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<"identifier" | "otp" | "success">("identifier");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  const scrollViewRef = useRef<any>(null);
  const [keyboardActive, setKeyboardActive] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardActive(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardActive(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePasswordFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleSubmit = async () => {
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMessage("Please enter your email/mobile and password.");
      return;
    }

    setErrorMessage("");
    setBusy(true);

    try {
      const profile = await login(cleanId, password);
      const isAdmin = profile.role === "admin" || profile.role_id === 1;
      if (isAdmin) {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(user)/home");
      }
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        (err?.response?.status === 401
          ? "Invalid email/mobile or password"
          : err?.message || "Could not connect to server. Please try again.");
      setErrorMessage(serverMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenForgotPassword = () => {
    setResetStep("identifier");
    setResetIdentifier(identifier.trim());
    setResetToken("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccessMsg("");
    setForgotModalVisible(true);
  };

  const handleSendOtp = async () => {
    const cleanId = resetIdentifier.trim();
    if (!cleanId) {
      setResetError("Please enter your registered email address or mobile number.");
      return;
    }

    setResetError("");
    setResetBusy(true);

    try {
      const res = await requestPasswordReset(cleanId);
      if (res?.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
      setResetSuccessMsg(
        res?.message || "If the account exists, instructions and OTP have been dispatched."
      );
      setResetStep("otp");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to request password reset. Please check your network.";
      setResetError(msg);
    } finally {
      setResetBusy(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setResetError("Please enter the complete 6-digit verification OTP.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setResetError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("New password and confirm password do not match.");
      return;
    }

    if (!resetToken) {
      setResetError("Password reset session expired or missing token. Please restart the request.");
      return;
    }

    setResetError("");
    setResetBusy(true);

    try {
      const res = await resetPassword({
        token: resetToken,
        otp: cleanOtp,
        password: newPassword,
      });

      setResetSuccessMsg(res?.message || "Password reset successfully!");
      setResetStep("success");
      // Auto-fill identifier into main login input
      if (resetIdentifier) {
        setIdentifier(resetIdentifier);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid or expired OTP. Please try again.";
      setResetError(msg);
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContainer,
            keyboardActive && styles.scrollContainerKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Responsive AquaPay Logo Header */}
          <View
            style={[
              styles.brandContainer,
              keyboardActive && styles.brandContainerKeyboard,
            ]}
          >
            <Image
              source={require("../../assets/images/company/Aqyapay logo.jpeg")}
              style={[
                styles.logoImage,
                keyboardActive && styles.logoImageKeyboard,
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Enter your credentials to continue</Text>

            {/* Error Message Alert */}
            {Boolean(errorMessage) && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Identifier Input */}
            <Text style={styles.label}>Email or Mobile Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                placeholder="you@example.com or 9876543210"
                placeholderTextColor={colors.muted}
                editable={!busy}
              />
            </View>

            {/* Password Input */}
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                onPress={handleOpenForgotPassword}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage("");
                }}
                onFocus={handlePasswordFocus}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                editable={!busy}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Flow Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!resetBusy) setForgotModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconBox}>
                  <Ionicons
                    name={
                      resetStep === "success"
                        ? "checkmark-circle"
                        : resetStep === "otp"
                        ? "shield-checkmark"
                        : "key"
                    }
                    size={22}
                    color={colors.blue}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalTitle}>
                    {resetStep === "success"
                      ? "Password Updated"
                      : resetStep === "otp"
                      ? "Verify OTP"
                      : "Reset Password"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {resetStep === "success"
                      ? "Your account credentials are secured"
                      : resetStep === "otp"
                      ? "Step 2 of 2: Confirm new password"
                      : "Step 1 of 2: Identity verification"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setForgotModalVisible(false)}
                  disabled={resetBusy}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Status or Error Notice */}
              {Boolean(resetError) && (
                <View style={styles.modalAlertError}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.modalAlertText}>{resetError}</Text>
                </View>
              )}

              {/* STEP 1: Enter Email or Mobile */}
              {resetStep === "identifier" && (
                <View style={styles.modalBody}>
                  <Text style={styles.stepInstruction}>
                    Enter your registered email address or mobile number. We will dispatch a 6-digit OTP to reset your password.
                  </Text>

                  <Text style={styles.modalLabel}>Email or Mobile Number</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={colors.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={resetIdentifier}
                      onChangeText={(val) => {
                        setResetIdentifier(val);
                        if (resetError) setResetError("");
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      placeholder="e.g. admin@gmail.com or 9876543210"
                      placeholderTextColor={colors.muted}
                      editable={!resetBusy}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, resetBusy && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={resetBusy}
                    activeOpacity={0.85}
                  >
                    {resetBusy ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.modalActionBtnText}>Send Verification OTP</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Enter OTP & New Password */}
              {resetStep === "otp" && (
                <View style={styles.modalBody}>
                  <Text style={styles.stepInstruction}>
                    Enter the 6-digit code sent to{" "}
                    <Text style={{ fontWeight: "700", color: colors.navy }}>
                      {resetIdentifier}
                    </Text>
                    .
                  </Text>

                  {/* Dev Tip Banner */}
                  <View style={styles.devTipBanner}>
                    <Ionicons name="information-circle-outline" size={16} color="#0369A1" />
                    <Text style={styles.devTipText}>
                      Check your terminal console or backend log for the development OTP.
                    </Text>
                  </View>

                  <Text style={styles.modalLabel}>6-Digit OTP</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="keypad-outline"
                      size={20}
                      color={colors.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      value={otpCode}
                      onChangeText={(val) => {
                        setOtpCode(val.replace(/[^0-9]/g, "").slice(0, 6));
                        if (resetError) setResetError("");
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="000000"
                      placeholderTextColor={colors.muted}
                      editable={!resetBusy}
                    />
                  </View>

                  <Text style={styles.modalLabel}>New Password (min 8 chars)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        if (resetError) setResetError("");
                      }}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="••••••••"
                      placeholderTextColor={colors.muted}
                      editable={!resetBusy}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword((prev) => !prev)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (resetError) setResetError("");
                      }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="••••••••"
                      placeholderTextColor={colors.muted}
                      editable={!resetBusy}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.modalBackBtn}
                      onPress={() => {
                        setResetStep("identifier");
                        setResetError("");
                      }}
                      disabled={resetBusy}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.text} />
                      <Text style={styles.modalBackBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionBtn, { flex: 1, marginTop: 0 }, resetBusy && styles.buttonDisabled]}
                      onPress={handleResetPassword}
                      disabled={resetBusy}
                      activeOpacity={0.85}
                    >
                      {resetBusy ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.modalActionBtnText}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: Success Screen */}
              {resetStep === "success" && (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark" size={32} color="#16A34A" />
                  </View>
                  <Text style={styles.successTitle}>Password Changed!</Text>
                  <Text style={styles.successDesc}>
                    {resetSuccessMsg || "Your password has been successfully reset. You can now sign in using your new credentials."}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={() => setForgotModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalActionBtnText}>Sign In Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  scrollContainerKeyboard: {
    justifyContent: "flex-start",
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 220 : 120,
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    width: "100%",
  },
  brandContainerKeyboard: {
    marginBottom: 8,
  },
  logoImage: {
    width: "100%",
    maxWidth: 320,
    height: 155,
  },
  logoImageKeyboard: {
    height: 65,
    maxWidth: 220,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
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
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  forgotPasswordLink: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.blue,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  otpInput: {
    letterSpacing: 6,
    fontSize: 18,
    fontWeight: "700",
  },
  eyeButton: {
    padding: 6,
  },
  button: {
    backgroundColor: colors.blue,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    padding: 20,
  },
  modalBackdrop: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAlertError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
  },
  modalAlertText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  modalBody: {
    marginTop: 4,
  },
  stepInstruction: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  modalActionBtn: {
    backgroundColor: colors.blue,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 8,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  modalBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: colors.bg,
  },
  modalBackBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  devTipBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 6,
  },
  devTipText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 14,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
});
