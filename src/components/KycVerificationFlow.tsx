import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { colors } from "../theme/colors";
import {
  getUserKyc,
  saveStep1Kyc,
  saveStep2Kyc,
  saveStep3Kyc,
  saveStep4Kyc,
  saveStep5Kyc,
  saveStep6Kyc,
  submitKycForReview,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  UserKycRecord,
} from "../utils/kycStore";
import StatusModal from "./StatusModal";

export interface KycStep {
  id: number;
  name: string;
  subtitle: string;
}

const KYC_STEPS: KycStep[] = [
  { id: 1, name: "Basic Details", subtitle: "Shop and owner details" },
  { id: 2, name: "Aadhaar Auth", subtitle: "UIDAI OTP verification" },
  { id: 3, name: "PAN Verification", subtitle: "Income Tax ID" },
  { id: 4, name: "Bank Account", subtitle: "Settlement account" },
  { id: 5, name: "Photos & Media", subtitle: "Selfie & shop photo" },
  { id: 6, name: "Agreements", subtitle: "Terms & merchant consent" },
  { id: 7, name: "Final Review", subtitle: "Review & submit" },
];

const ENTITY_TYPES = [
  "Sole Proprietorship",
  "Individual / Freelance",
  "Partnership Firm",
  "Private Limited",
  "Retail Merchant",
];

const CATEGORIES = [
  "Mobile & Telecom",
  "Electronics",
  "Kirana & Grocery",
  "Banking Point / CSP",
  "General Store",
];

interface Props {
  userId?: number | string;
  onStepComplete?: (stepId: number) => void;
  onKycUpdated?: (record: UserKycRecord) => void;
}

export default function KycVerificationFlow({
  userId,
  onStepComplete,
  onKycUpdated,
}: Props) {
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  const effectiveUserId = userId || user?.id || "current_user";

  const [record, setRecord] = useState<UserKycRecord | null>(null);
  const [activeModalStep, setActiveModalStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Step 1 State
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [entityType, setEntityType] = useState(ENTITY_TYPES[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Step 2 State
  const [aadhaarRaw, setAadhaarRaw] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Step 3 State
  const [panNumber, setPanNumber] = useState("");
  const [panDob, setPanDob] = useState("");

  // Step 4 State
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [holderName, setHolderName] = useState("");

  // Step 5 State
  const [selfieAttached, setSelfieAttached] = useState(false);
  const [shopPhotoAttached, setShopPhotoAttached] = useState(false);

  // Step 6 State
  const [term1, setTerm1] = useState(false);
  const [term2, setTerm2] = useState(false);

  // Status Modal
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    primaryButtonText?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const rec = await getUserKyc(effectiveUserId);
        if (!isMounted) return;
        setRecord(rec);

        // Populate existing values
        if (rec.step1Data) {
          setFullName(rec.step1Data.fullName || user?.name || "");
          setShopName(rec.step1Data.shopName || user?.shopname || "");
          setEntityType(rec.step1Data.entityType || ENTITY_TYPES[0]);
          setCategory(rec.step1Data.category || CATEGORIES[0]);
          setAddress(rec.step1Data.address || user?.address || "");
          setCity(rec.step1Data.city || user?.city || "");
          setState(rec.step1Data.state || user?.state || "");
          setPincode(rec.step1Data.pincode || user?.pincode || "");
        } else {
          setFullName(user?.name || "");
          setShopName(user?.shopname || "");
          setAddress(user?.address || "");
          setCity(user?.city || "");
          setState(user?.state || "");
          setPincode(user?.pincode || "");
        }

        if (rec.step2Data) {
          setAadhaarRaw(rec.step2Data.aadhaarNumber || "");
        }

        if (rec.step3Data) {
          setPanNumber(rec.step3Data.panNumber || "");
          setPanDob(rec.step3Data.dob || "");
        }

        if (rec.step4Data) {
          setAccountNumber(rec.step4Data.accountNumber || "");
          setConfirmAccount(rec.step4Data.accountNumber || "");
          setIfscCode(rec.step4Data.ifscCode || "");
          setBankName(rec.step4Data.bankName || "");
          setHolderName(rec.step4Data.accountHolderName || "");
        }

        if (rec.step5Data) {
          setSelfieAttached(!!rec.step5Data.selfieImage);
          setShopPhotoAttached(!!rec.step5Data.shopFrontImage);
        }

        if (rec.step6Data) {
          setTerm1(!!rec.step6Data.termsAccepted);
          setTerm2(!!rec.step6Data.declarationAccepted);
        }
      } catch {
        // quiet fallback
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [effectiveUserId, user]);

  const completedSteps = record?.completedSteps || [];
  const currentStep = record?.currentStep || 1;
  const progressPercent = Math.round((completedSteps.length / KYC_STEPS.length) * 100);

  const handleStepPress = (step: KycStep) => {
    // If under review or approved, user can view completed steps
    const isCompleted = completedSteps.includes(step.id);
    const isAllowed = isCompleted || step.id <= currentStep;

    if (!isAllowed) {
      Alert.alert(
        "Step Locked",
        `Please complete Step ${step.id - 1} before proceeding.`
      );
      return;
    }

    setFormError("");
    setActiveModalStep(step.id);
  };

  // Step 1 Handler
  const handleSaveStep1 = async () => {
    setFormError("");
    const nameVal = fullName.trim();
    const shopVal = shopName.trim();
    const addrVal = address.trim();
    const cityVal = city.trim();
    const stateVal = state.trim();
    const pinVal = pincode.trim();

    if (!nameVal || nameVal.length < 2) {
      setFormError("Please enter legal owner name.");
      return;
    }
    if (!shopVal || shopVal.length < 2) {
      setFormError("Please enter shop or business name.");
      return;
    }
    if (!addrVal || addrVal.length < 4) {
      setFormError("Please enter business address.");
      return;
    }
    if (!cityVal) {
      setFormError("Please enter city.");
      return;
    }
    if (!stateVal) {
      setFormError("Please enter state.");
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pinVal)) {
      setFormError("Please enter a valid 6-digit PIN code.");
      return;
    }

    try {
      setSaving(true);
      const data: Step1Data = {
        fullName: nameVal,
        shopName: shopVal,
        entityType,
        category,
        address: addrVal,
        city: cityVal,
        state: stateVal,
        pincode: pinVal,
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep1Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(1);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 1 Completed",
        message: "Basic business details saved.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to save details.");
    } finally {
      setSaving(false);
    }
  };

  // Step 2 Handler
  const handleSendAadhaarOtp = () => {
    const raw = aadhaarRaw.replace(/\s/g, "");
    if (raw.length !== 12 || !/^\d{12}$/.test(raw)) {
      setFormError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setFormError("");
    setOtpSent(true);
    showNotification({
      title: "Aadhaar OTP Sent",
      message: "Demo verification OTP sent: 123456",
      type: "system",
    });
  };

  const handleSaveStep2 = async () => {
    setFormError("");
    const raw = aadhaarRaw.replace(/\s/g, "");
    if (raw.length !== 12) {
      setFormError("Please enter 12-digit Aadhaar number.");
      return;
    }
    if (!otpSent) {
      setFormError("Please tap 'Get OTP' to verify Aadhaar.");
      return;
    }
    if (otpValue.trim().length !== 6) {
      setFormError("Please enter the 6-digit verification OTP (Demo: 123456).");
      return;
    }

    try {
      setSaving(true);
      const masked = "•••• •••• " + raw.slice(-4);
      const data: Step2Data = {
        aadhaarNumber: masked,
        verified: true,
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep2Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(2);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 2 Completed",
        message: "Aadhaar verified successfully.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "Aadhaar verification failed.");
    } finally {
      setSaving(false);
    }
  };

  // Step 3 Handler
  const handleSaveStep3 = async () => {
    setFormError("");
    const pan = panNumber.trim().toUpperCase();
    const dob = panDob.trim();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      setFormError("Please enter a valid 10-character PAN (e.g. ABCDE1234F).");
      return;
    }
    if (!dob || dob.length < 8) {
      setFormError("Please enter Date of Birth (DD/MM/YYYY).");
      return;
    }

    try {
      setSaving(true);
      const data: Step3Data = {
        panNumber: pan,
        dob,
        verified: true,
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep3Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(3);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 3 Completed",
        message: "PAN card verified successfully.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "PAN verification failed.");
    } finally {
      setSaving(false);
    }
  };

  // Step 4 Handler
  const handleSaveStep4 = async () => {
    setFormError("");
    const acc = accountNumber.trim();
    const confirm = confirmAccount.trim();
    const ifsc = ifscCode.trim().toUpperCase();
    const bank = bankName.trim();
    const holder = holderName.trim() || fullName.trim();

    if (!acc || acc.length < 8) {
      setFormError("Please enter a valid bank account number.");
      return;
    }
    if (acc !== confirm) {
      setFormError("Account numbers do not match.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setFormError("Please enter a valid 11-character IFSC code (e.g. HDFC0001234).");
      return;
    }
    if (!bank) {
      setFormError("Please enter bank name.");
      return;
    }

    try {
      setSaving(true);
      const masked = "•••• " + acc.slice(-4);
      const data: Step4Data = {
        accountNumber: masked,
        ifscCode: ifsc,
        bankName: bank,
        accountHolderName: holder,
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep4Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(4);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 4 Completed",
        message: "Settlement bank account linked.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to save bank details.");
    } finally {
      setSaving(false);
    }
  };

  // Step 5 Handler
  const handleSaveStep5 = async () => {
    setFormError("");
    if (!selfieAttached) {
      setFormError("Please capture your live merchant selfie.");
      return;
    }
    if (!shopPhotoAttached) {
      setFormError("Please capture your shop front / entrance photo.");
      return;
    }

    try {
      setSaving(true);
      const data: Step5Data = {
        selfieImage: "merchant_selfie_verified.jpg",
        shopFrontImage: "shop_front_entrance.jpg",
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep5Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(5);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 5 Completed",
        message: "Photos attached successfully.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to save photos.");
    } finally {
      setSaving(false);
    }
  };

  // Step 6 Handler
  const handleSaveStep6 = async () => {
    setFormError("");
    if (!term1 || !term2) {
      setFormError("Please accept both partner terms & declaration.");
      return;
    }

    try {
      setSaving(true);
      const data: Step6Data = {
        termsAccepted: true,
        declarationAccepted: true,
        submittedAt: new Date().toISOString(),
      };

      const updated = await saveStep6Kyc(effectiveUserId, data);
      setRecord(updated);
      if (onStepComplete) onStepComplete(6);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);
      showNotification({
        title: "Step 6 Completed",
        message: "Terms and merchant agreements accepted.",
        type: "kyc",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to save agreement.");
    } finally {
      setSaving(false);
    }
  };

  // Step 7 Handler: Submit for Admin Review
  const handleSubmitAllKyc = async () => {
    setFormError("");
    // Ensure all 6 steps are completed
    const required = [1, 2, 3, 4, 5, 6];
    const missing = required.filter((s) => !completedSteps.includes(s));
    if (missing.length > 0) {
      setFormError(`Please complete Step ${missing[0]} before final submission.`);
      return;
    }

    try {
      setSaving(true);
      const updated = await submitKycForReview(effectiveUserId);
      setRecord(updated);
      if (onStepComplete) onStepComplete(7);
      if (onKycUpdated) onKycUpdated(updated);

      setActiveModalStep(null);

      showNotification({
        title: "KYC Submitted",
        message: "All 7 steps submitted. Under review by Admin.",
        type: "kyc",
        actionRoute: "/(admin)/kyc",
      });

      setStatusModal({
        visible: true,
        type: "success",
        title: "KYC Submitted!",
        message: "All 7 verification steps have been submitted. An admin will review and approve your account shortly.",
        primaryButtonText: "Done",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to submit KYC.");
    } finally {
      setSaving(false);
    }
  };

  const isUnderReview = record?.status === "under_review";
  const isApproved = record?.status === "approved";
  const isRejected = record?.status === "rejected";

  return (
    <View style={styles.container}>
      {/* Rejection Alert Banner if Admin rejected */}
      {isRejected && (
        <View style={styles.rejectionBanner}>
          <View style={styles.rejectionHeader}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.rejectionTitle}>KYC Needs Correction</Text>
          </View>
          <Text style={styles.rejectionText}>
            Reason: {record?.rejectionReason || "Please verify your details and re-submit."}
          </Text>
          <Text style={styles.rejectionHint}>
            Please tap the rejected step below to update and re-submit Step 7.
          </Text>
        </View>
      )}

      {/* Under Review Notice */}
      {isUnderReview && (
        <View style={styles.reviewBanner}>
          <Ionicons name="time" size={18} color="#0284C7" />
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewBannerTitle}>KYC Under Review</Text>
            <Text style={styles.reviewBannerSubtitle}>
              All 7 steps submitted. Admin verification in progress.
            </Text>
          </View>
        </View>
      )}

      {/* Approved Notice */}
      {isApproved && (
        <View style={styles.approvedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.approvedBannerTitle}>KYC Approved</Text>
            <Text style={styles.approvedBannerSubtitle}>
              Your account is active. Team and partner features are unlocked.
            </Text>
          </View>
        </View>
      )}

      {/* Progress Header */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressTitle}>KYC Verification</Text>
          <Text style={styles.progressCounter}>
            {completedSteps.length} of {KYC_STEPS.length} Steps
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.max(progressPercent, 6)}%`,
                backgroundColor: isApproved ? "#16A34A" : colors.blue,
              },
            ]}
          />
        </View>
      </View>

      {/* 7 Verification Steps List */}
      <View style={styles.stepsCard}>
        {KYC_STEPS.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isLocked = !isDone && step.id > currentStep;

          return (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepRow,
                index > 0 && styles.stepRowBorder,
              ]}
              onPress={() => handleStepPress(step)}
              activeOpacity={isLocked ? 1 : 0.7}
            >
              {/* Step Circle */}
              <View
                style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleDone,
                  isCurrent && !isDone && styles.stepCircleActive,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isCurrent && styles.stepNumberActive,
                    ]}
                  >
                    {step.id}
                  </Text>
                )}
              </View>

              {/* Step Info */}
              <View style={styles.stepInfo}>
                <Text
                  style={[
                    styles.stepName,
                    isDone && styles.stepNameDone,
                  ]}
                >
                  {step.name}
                </Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>

              {/* Status Pill */}
              {isDone ? (
                <View style={styles.pillDone}>
                  <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                  <Text style={styles.pillDoneText}>Done</Text>
                </View>
              ) : isCurrent ? (
                <View style={styles.pillActive}>
                  <Text style={styles.pillActiveText}>
                    {step.id === 7 ? "Submit" : "Start"}
                  </Text>
                  <Ionicons name="chevron-forward" size={11} color={colors.blue} />
                </View>
              ) : (
                <View style={styles.pillLocked}>
                  <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                  <Text style={styles.pillLockedText}>Locked</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step Modal */}
      <Modal
        visible={activeModalStep !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModalStep(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {KYC_STEPS.find((s) => s.id === activeModalStep)?.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Step {activeModalStep} of 7
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveModalStep(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* STEP 1: Basic Details */}
              {activeModalStep === 1 && (
                <View style={styles.stepForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Legal Owner Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter legal owner name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Shop / Business Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={shopName}
                      onChangeText={setShopName}
                      placeholder="Enter shop name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Type</Text>
                    <View style={styles.pillsRow}>
                      {ENTITY_TYPES.map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.selectPill,
                            entityType === t && styles.selectPillActive,
                          ]}
                          onPress={() => setEntityType(t)}
                        >
                          <Text
                            style={[
                              styles.selectPillText,
                              entityType === t && styles.selectPillTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.pillsRow}>
                      {CATEGORIES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.selectPill,
                            category === c && styles.selectPillActive,
                          ]}
                          onPress={() => setCategory(c)}
                        >
                          <Text
                            style={[
                              styles.selectPillText,
                              category === c && styles.selectPillTextActive,
                            ]}
                          >
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Operating Address *</Text>
                    <TextInput
                      style={[styles.textInput, styles.addressInput]}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Shop address, street, area"
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>City *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>State *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={state}
                        onChangeText={setState}
                        placeholder="State"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>PIN Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={pincode}
                      onChangeText={(t) =>
                        setPincode(t.replace(/[^0-9]/g, "").slice(0, 6))
                      }
                      placeholder="6-digit PIN"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep1}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Aadhaar Auth */}
              {activeModalStep === 2 && (
                <View style={styles.stepForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>12-Digit Aadhaar Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={aadhaarRaw}
                      onChangeText={(t) => setAadhaarRaw(t.replace(/[^0-9]/g, "").slice(0, 12))}
                      placeholder="Enter 12-digit Aadhaar number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={12}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.actionOutlineBtn, otpSent && styles.actionOutlineBtnSuccess]}
                    onPress={handleSendAadhaarOtp}
                  >
                    <Ionicons
                      name={otpSent ? "checkmark-circle" : "send"}
                      size={15}
                      color={otpSent ? "#16A34A" : colors.blue}
                    />
                    <Text style={[styles.actionOutlineBtnText, otpSent && { color: "#16A34A" }]}>
                      {otpSent ? "OTP Sent (Demo: 123456)" : "Get Aadhaar OTP"}
                    </Text>
                  </TouchableOpacity>

                  {otpSent && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Enter 6-Digit OTP *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={otpValue}
                        onChangeText={(t) => setOtpValue(t.replace(/[^0-9]/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep2}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: PAN Card */}
              {activeModalStep === 3 && (
                <View style={styles.stepForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>PAN Card Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={panNumber}
                      onChangeText={(t) => setPanNumber(t.toUpperCase().slice(0, 10))}
                      placeholder="e.g. ABCDE1234F"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date of Birth (DD/MM/YYYY) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={panDob}
                      onChangeText={setPanDob}
                      placeholder="e.g. 15/08/1990"
                      placeholderTextColor="#94A3B8"
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep3}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 4: Bank Account */}
              {activeModalStep === 4 && (
                <View style={styles.stepForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={accountNumber}
                      onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ""))}
                      placeholder="Enter bank account number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm Account Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={confirmAccount}
                      onChangeText={(t) => setConfirmAccount(t.replace(/[^0-9]/g, ""))}
                      placeholder="Re-enter bank account number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>IFSC Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={ifscCode}
                      onChangeText={(t) => setIfscCode(t.toUpperCase().slice(0, 11))}
                      placeholder="e.g. HDFC0001234"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      maxLength={11}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={holderName || fullName}
                      onChangeText={setHolderName}
                      placeholder="Account holder name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep4}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 5: Photos & Media */}
              {activeModalStep === 5 && (
                <View style={styles.stepForm}>
                  <View style={styles.mediaCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mediaTitle}>Live Merchant Selfie *</Text>
                      <Text style={styles.mediaSubtitle}>
                        {selfieAttached ? "merchant_selfie_live.jpg (Attached)" : "Clear photo of your face"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.mediaBtn, selfieAttached && styles.mediaBtnDone]}
                      onPress={() => setSelfieAttached(!selfieAttached)}
                    >
                      <Ionicons
                        name={selfieAttached ? "checkmark-circle" : "camera"}
                        size={15}
                        color={selfieAttached ? "#16A34A" : colors.blue}
                      />
                      <Text style={[styles.mediaBtnText, selfieAttached && { color: "#16A34A" }]}>
                        {selfieAttached ? "Attached" : "Capture"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.mediaCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mediaTitle}>Shop Front / Counter Photo *</Text>
                      <Text style={styles.mediaSubtitle}>
                        {shopPhotoAttached ? "shop_front_entrance.jpg (Attached)" : "Exterior or outlet counter photo"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.mediaBtn, shopPhotoAttached && styles.mediaBtnDone]}
                      onPress={() => setShopPhotoAttached(!shopPhotoAttached)}
                    >
                      <Ionicons
                        name={shopPhotoAttached ? "checkmark-circle" : "camera"}
                        size={15}
                        color={shopPhotoAttached ? "#16A34A" : colors.blue}
                      />
                      <Text style={[styles.mediaBtnText, shopPhotoAttached && { color: "#16A34A" }]}>
                        {shopPhotoAttached ? "Attached" : "Capture"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep5}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 6: Merchant Agreement */}
              {activeModalStep === 6 && (
                <View style={styles.stepForm}>
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => setTerm1(!term1)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={term1 ? "checkbox" : "square-outline"}
                      size={22}
                      color={term1 ? colors.blue : "#94A3B8"}
                    />
                    <Text style={styles.checkText}>
                      I confirm that all business and identity details provided are genuine and accurate.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => setTerm2(!term2)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={term2 ? "checkbox" : "square-outline"}
                      size={22}
                      color={term2 ? colors.blue : "#94A3B8"}
                    />
                    <Text style={styles.checkText}>
                      I accept the partner merchant service terms and authorize compliance verification.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSaveStep6}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Accept & Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 7: Review & Final Submit */}
              {activeModalStep === 7 && (
                <View style={styles.stepForm}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Verification Summary</Text>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>1. Business:</Text>
                      <Text style={styles.summaryVal}>
                        {record?.step1Data?.shopName || shopName || "Pending"}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>2. Aadhaar:</Text>
                      <Text style={styles.summaryVal}>
                        {record?.step2Data?.aadhaarNumber || "Verified"}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>3. PAN Card:</Text>
                      <Text style={styles.summaryVal}>
                        {record?.step3Data?.panNumber || panNumber || "Verified"}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>4. Bank:</Text>
                      <Text style={styles.summaryVal}>
                        {record?.step4Data?.bankName || bankName || "Linked"}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>5. Media:</Text>
                      <Text style={styles.summaryVal}>Selfie & Shop Photo</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>6. Terms:</Text>
                      <Text style={styles.summaryVal}>Accepted</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                    onPress={handleSubmitAllKyc}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Submit KYC for Admin Approval
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Clean Status Modal */}
      {statusModal && (
        <StatusModal
          visible={statusModal.visible}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          primaryButtonText={statusModal.primaryButtonText}
          onPrimaryPress={() => setStatusModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  rejectionBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  rejectionText: {
    fontSize: 13,
    color: "#7F1D1D",
    marginTop: 2,
    fontWeight: "500",
  },
  rejectionHint: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
  },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 10,
  },
  reviewBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369A1",
  },
  reviewBannerSubtitle: {
    fontSize: 12,
    color: "#0C4A6E",
    marginTop: 2,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 10,
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
  },
  approvedBannerSubtitle: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  progressCounter: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stepRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepCircleActive: {
    backgroundColor: colors.blue,
  },
  stepCircleDone: {
    backgroundColor: "#16A34A",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  stepNameDone: {
    color: "#334155",
  },
  stepSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  pillDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pillDoneText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  pillActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pillActiveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },
  pillLocked: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pillLockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  stepForm: {
    gap: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textInput: {
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.navy,
  },
  addressInput: {
    height: 64,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  twoColRow: {
    flexDirection: "row",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  selectPillActive: {
    backgroundColor: colors.blue,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  selectPillTextActive: {
    color: "#FFFFFF",
  },
  actionOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.lightBlue,
    gap: 6,
  },
  actionOutlineBtnSuccess: {
    borderColor: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  actionOutlineBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.blue,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  mediaSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.blue,
    gap: 4,
  },
  mediaBtnDone: {
    borderColor: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  mediaBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  submitBtn: {
    height: 46,
    backgroundColor: colors.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
