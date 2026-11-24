import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  Step1Data,
  UserKycRecord,
} from "../utils/kycStore";
import StatusModal from "./StatusModal";

export interface KycStep {
  id: number;
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  timeEstimate: string;
  whatIsNeeded: string;
  actionButtonText: string;
  detailsHint: string;
}

const KYC_STEPS: KycStep[] = [
  {
    id: 1,
    name: "Basic Details",
    subtitle: "Personal & Business",
    icon: "person-outline",
    description:
      "Enter your basic shop details, business name, and registered contact information so customers and partners can identify your outlet.",
    timeEstimate: "~1 minute",
    whatIsNeeded: "Shop name, owner name & full operating address",
    actionButtonText: "Start Basic Details",
    detailsHint: "Make sure the shop name matches your trade license or signboard.",
  },
  {
    id: 2,
    name: "Aadhaar Auth",
    subtitle: "UIDAI OTP verify",
    icon: "finger-print-outline",
    description:
      "Verify your identity quickly using a 6-digit one-time password (OTP) sent to the mobile number registered with your Aadhaar.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "12-digit Aadhaar number and OTP received on your phone",
    actionButtonText: "Aadhaar Verification (Step 2)",
    detailsHint: "Keep the phone registered with your Aadhaar nearby to receive the OTP.",
  },
  {
    id: 3,
    name: "PAN Verification",
    subtitle: "Income Tax ID",
    icon: "card-outline",
    description:
      "Verify your Permanent Account Number (PAN) issued by the Income Tax Department to link your financial compliance records.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "10-character PAN card number & Date of Birth",
    actionButtonText: "Verify PAN Card (Step 3)",
    detailsHint: "Your name on the PAN card should match your Aadhaar name.",
  },
  {
    id: 4,
    name: "Bank Details",
    subtitle: "Settlement account",
    icon: "business-outline",
    description:
      "Link your bank account where your customer payment settlements and wallet transfers will be directly deposited.",
    timeEstimate: "~1 minute",
    whatIsNeeded: "Bank account number, re-enter account number & IFSC code",
    actionButtonText: "Add Bank Account (Step 4)",
    detailsHint: "A ₹1 test deposit (penny drop) will confirm your account name instantly.",
  },
  {
    id: 5,
    name: "Media Uploads",
    subtitle: "Photos & Video",
    icon: "camera-outline",
    description:
      "Upload a clear live selfie photo and an exterior picture of your merchant shop counter to verify physical business presence.",
    timeEstimate: "~1 minute",
    whatIsNeeded: "Live merchant selfie & shop front photo",
    actionButtonText: "Upload Photos (Step 5)",
    detailsHint: "Ensure the photos are taken in good lighting with no glare.",
  },
  {
    id: 6,
    name: "Agreements",
    subtitle: "Terms & consent",
    icon: "document-text-outline",
    description:
      "Review and accept the partner merchant service terms and compliance consent to finalize account activation.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "Read and accept merchant terms & privacy policy",
    actionButtonText: "Review Terms (Step 6)",
    detailsHint: "Terms cover data privacy, commission settlements, and security guidelines.",
  },
  {
    id: 7,
    name: "Review & Submit",
    subtitle: "Final submission",
    icon: "checkmark-done-circle-outline",
    description:
      "Audit all your submitted verification details and send them to the compliance team for final account activation.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "Final confirmation of all submitted KYC entries",
    actionButtonText: "Submit KYC for Admin Approval (Step 7)",
    detailsHint: "Once submitted, the compliance team audits and approves your activation.",
  },
];

const ENTITY_TYPES = [
  "Sole Proprietorship",
  "Individual / Freelance",
  "Partnership Firm",
  "Private Limited",
  "Retail Merchant",
];

const CATEGORIES = [
  "Mobile & Telecom Recharge",
  "Electronics & Appliances",
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

  const [, setKycRecord] = useState<UserKycRecord | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStep, setSelectedStep] = useState<KycStep>(KYC_STEPS[0]);

  // Step 1 Form State
  const [step1FullName, setStep1FullName] = useState("");
  const [step1ShopName, setStep1ShopName] = useState("");
  const [step1EntityType, setStep1EntityType] = useState(ENTITY_TYPES[0]);
  const [step1Category, setStep1Category] = useState(CATEGORIES[0]);
  const [step1Address, setStep1Address] = useState("");
  const [step1City, setStep1City] = useState("");
  const [step1State, setStep1State] = useState("");
  const [step1Pincode, setStep1Pincode] = useState("");
  const [step1Error, setStep1Error] = useState("");
  const [step1Saving, setStep1Saving] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    primaryButtonText?: string;
  } | null>(null);

  // Load persistent KYC record for this user
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const record = await getUserKyc(effectiveUserId);
        if (isMounted) {
          setKycRecord(record);
          setCompletedSteps(record.completedSteps || []);
          setActiveStep(record.currentStep || 1);

          // Populate Step 1 inputs from saved record or user profile
          if (record.step1Data) {
            setStep1FullName(record.step1Data.fullName || user?.name || "");
            setStep1ShopName(record.step1Data.shopName || user?.shopname || "");
            setStep1EntityType(record.step1Data.entityType || ENTITY_TYPES[0]);
            setStep1Category(record.step1Data.category || CATEGORIES[0]);
            setStep1Address(record.step1Data.address || user?.address || "");
            setStep1City(record.step1Data.city || user?.city || "");
            setStep1State(record.step1Data.state || user?.state || "");
            setStep1Pincode(record.step1Data.pincode || user?.pincode || "");
          } else {
            setStep1FullName(user?.name || "");
            setStep1ShopName(user?.shopname || "");
            setStep1Address(user?.address || "");
            setStep1City(user?.city || "");
            setStep1State(user?.state || "");
            setStep1Pincode(user?.pincode || "");
          }
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

  const currentStepData =
    KYC_STEPS.find((s) => s.id === activeStep) || KYC_STEPS[0];

  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / KYC_STEPS.length) * 100);

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepCurrent = (stepId: number) => stepId === activeStep;
  const isStepLocked = (stepId: number) =>
    !isStepCompleted(stepId) && !isStepCurrent(stepId) && stepId > activeStep;

  const handleStepPress = (step: KycStep) => {
    if (isStepLocked(step.id)) {
      setStatusModal({
        visible: true,
        type: "info",
        title: "Step Locked",
        message: `Please complete Step ${activeStep}: "${currentStepData.name}" before unlocking Step ${step.id}.`,
        primaryButtonText: "Got It",
      });
      return;
    }
    setSelectedStep(step);
    setStep1Error("");
    setModalVisible(true);
  };

  const handleStartCurrentAction = () => {
    setSelectedStep(currentStepData);
    setStep1Error("");
    setModalVisible(true);
  };

  // Step 1 Validation & Submission Handler
  const handleSaveStep1 = async () => {
    setStep1Error("");

    const name = step1FullName.trim();
    const shop = step1ShopName.trim();
    const addr = step1Address.trim();
    const city = step1City.trim();
    const state = step1State.trim();
    const pin = step1Pincode.trim();

    if (!name || name.length < 2) {
      setStep1Error("Please enter your legal owner / applicant name.");
      return;
    }
    if (!shop || shop.length < 3) {
      setStep1Error("Please enter your registered shop or outlet name (at least 3 characters).");
      return;
    }
    if (!addr || addr.length < 5) {
      setStep1Error("Please enter your full street address or location details.");
      return;
    }
    if (!city || city.length < 2) {
      setStep1Error("Please enter your operating city / district.");
      return;
    }
    if (!state || state.length < 2) {
      setStep1Error("Please enter your state.");
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setStep1Error("Please enter a valid 6-digit Indian postal PIN code (e.g. 400001).");
      return;
    }

    try {
      setStep1Saving(true);
      const data: Step1Data = {
        fullName: name,
        shopName: shop,
        entityType: step1EntityType,
        category: step1Category,
        address: addr,
        city,
        state,
        pincode: pin,
        submittedAt: new Date().toISOString(),
      };

      const updatedRecord = await saveStep1Kyc(effectiveUserId, data);
      setKycRecord(updatedRecord);
      setCompletedSteps(updatedRecord.completedSteps);
      setActiveStep(updatedRecord.currentStep);

      if (onStepComplete) {
        onStepComplete(1);
      }
      if (onKycUpdated) {
        onKycUpdated(updatedRecord);
      }

      showNotification({
        title: "Step 1 Verified & Saved",
        message: `${shop} basic details verified. Current phase: Step 2 (Aadhaar).`,
        type: "kyc",
        actionRoute: "/(admin)/kyc",
      });

      setModalVisible(false);

      setStatusModal({
        visible: true,
        type: "success",
        title: "Step 1 Basic Details Saved!",
        message: `Your business information for "${shop}" has been verified and registered. You are now ready for Step 2 (Aadhaar Auth).`,
        primaryButtonText: "Continue",
      });
    } catch (err: any) {
      setStep1Error(err?.message || "Failed to save Step 1 details. Please try again.");
    } finally {
      setStep1Saving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header section with progress indicator */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.shieldIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color={colors.navy} />
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Partner KYC Verification</Text>
            <Text style={styles.headerSubtitle}>
              Complete all 7 steps to activate your merchant account
            </Text>
          </View>
          <View style={styles.progressPercentBadge}>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(progressPercent, 10)}%` },
            ]}
          />
        </View>

        <View style={styles.progressSummaryRow}>
          <Text style={styles.progressSummaryText}>
            {completedCount} of {KYC_STEPS.length} steps completed
          </Text>
          <Text style={styles.timeRemainingText}>
            {isStepCompleted(1) ? "Phase: Step 2 Ready" : "Phase: Step 1 (Basic Details)"}
          </Text>
        </View>
      </View>

      {/* The Spotlight Card: Current Action */}
      <View style={styles.spotlightCard}>
        <View style={styles.spotlightTagRow}>
          <View style={styles.spotlightTag}>
            <View style={styles.pulsingDot} />
            <Text style={styles.spotlightTagText}>CURRENT ACTION</Text>
          </View>
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={13} color="#0284C7" />
            <Text style={styles.timeChipText}>{currentStepData.timeEstimate}</Text>
          </View>
        </View>

        <View style={styles.spotlightContentRow}>
          <View style={styles.spotlightIconWrapper}>
            <Ionicons
              name={currentStepData.icon}
              size={26}
              color={colors.blue}
            />
          </View>
          <View style={styles.spotlightTextCol}>
            <Text style={styles.spotlightStepNumber}>
              Step {currentStepData.id} of 7
            </Text>
            <Text style={styles.spotlightStepName}>
              {currentStepData.name}
            </Text>
            <Text style={styles.spotlightSubtitle}>
              {currentStepData.subtitle}
            </Text>
          </View>
        </View>

        <Text style={styles.spotlightDescription}>
          {currentStepData.description}
        </Text>

        {/* Spotlight Action Button */}
        <TouchableOpacity
          style={styles.spotlightActionButton}
          onPress={handleStartCurrentAction}
          activeOpacity={0.85}
        >
          <Text style={styles.spotlightActionText}>
            {isStepCompleted(currentStepData.id)
              ? `Review Step ${currentStepData.id} Details`
              : currentStepData.actionButtonText}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 7-Step Sequence List */}
      <Text style={styles.stepListSectionTitle}>Verification Stages</Text>

      <View style={styles.stepsCard}>
        {KYC_STEPS.map((step, index) => {
          const completed = isStepCompleted(step.id);
          const current = isStepCurrent(step.id);
          const locked = isStepLocked(step.id);

          return (
            <View key={step.id}>
              <TouchableOpacity
                style={[
                  styles.stepRow,
                  completed && styles.stepRowCompleted,
                  current && styles.stepRowCurrent,
                  locked && styles.stepRowLocked,
                ]}
                onPress={() => handleStepPress(step)}
                activeOpacity={locked ? 0.9 : 0.75}
              >
                {/* Left Step Circle Number or Checkmark */}
                <View
                  style={[
                    styles.stepCircle,
                    completed && styles.stepCircleCompleted,
                    current && styles.stepCircleCurrent,
                    locked && styles.stepCircleLocked,
                  ]}
                >
                  {completed ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleNumber,
                        current && styles.stepCircleNumberCurrent,
                        locked && styles.stepCircleNumberLocked,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>

                {/* Step Name & Subtitle */}
                <View style={styles.stepInfoCol}>
                  <View style={styles.stepTitleRow}>
                    <Text
                      style={[
                        styles.stepNameText,
                        completed && styles.textCompleted,
                        current && styles.textCurrent,
                        locked && styles.textLocked,
                      ]}
                    >
                      {step.id}. {step.name}
                    </Text>
                  </View>
                  <Text style={styles.stepSubtitleText}>{step.subtitle}</Text>
                </View>

                {/* Right Status Pill */}
                {completed ? (
                  <View style={styles.badgeCompleted}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#16A34A"
                    />
                    <Text style={styles.badgeCompletedText}>Done</Text>
                  </View>
                ) : current ? (
                  <View style={styles.badgeCurrent}>
                    <Text style={styles.badgeCurrentText}>In Progress</Text>
                  </View>
                ) : (
                  <View style={styles.badgeLocked}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={12}
                      color="#94A3B8"
                    />
                    <Text style={styles.badgeLockedText}>Locked</Text>
                  </View>
                )}
              </TouchableOpacity>

              {index < KYC_STEPS.length - 1 && (
                <View style={styles.connectingLineRow}>
                  <View
                    style={[
                      styles.connectingLine,
                      completed && styles.connectingLineCompleted,
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Honest Privacy Note */}
      <View style={styles.privacyNoteCard}>
        <Ionicons name="shield-checkmark" size={18} color="#059669" />
        <Text style={styles.privacyNoteText}>
          Your details are stored safely and used strictly for verifying your AquaPay
          partner merchant account.
        </Text>
      </View>

      {/* Step Modal: Fully Functional Step 1 Form, Controlled Step 2-7 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons
                  name={selectedStep.icon}
                  size={24}
                  color={colors.blue}
                />
              </View>
              <View style={styles.modalHeaderTextCol}>
                <Text style={styles.modalStepBadge}>
                  STEP {selectedStep.id} OF 7
                </Text>
                <Text style={styles.modalTitle}>{selectedStep.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedStep.subtitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedStep.id === 1 ? (
                /* Step 1: Real Interactive Basic Details Form */
                <View style={styles.step1Form}>
                  <Text style={styles.formSectionIntro}>
                    Please provide your business outlet and contact information.
                    This data is registered under your merchant compliance profile.
                  </Text>

                  {step1Error ? (
                    <View style={styles.formErrorBanner}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.formErrorText}>{step1Error}</Text>
                    </View>
                  ) : null}

                  {/* Legal Owner Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Legal Owner / Applicant Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={step1FullName}
                      onChangeText={setStep1FullName}
                      placeholder="e.g. Ramesh Kumar"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  {/* Shop Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Shop / Merchant Outlet Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={step1ShopName}
                      onChangeText={setStep1ShopName}
                      placeholder="e.g. Ramesh Telecom & General Store"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  {/* Business Entity Type */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Entity Type *</Text>
                    <View style={styles.pillSelectorRow}>
                      {ENTITY_TYPES.map((type) => {
                        const isSelected = step1EntityType === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.selectPill,
                              isSelected && styles.selectPillActive,
                            ]}
                            onPress={() => setStep1EntityType(type)}
                          >
                            <Text
                              style={[
                                styles.selectPillText,
                                isSelected && styles.selectPillTextActive,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Business Category */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Category *</Text>
                    <View style={styles.pillSelectorRow}>
                      {CATEGORIES.map((cat) => {
                        const isSelected = step1Category === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.selectPill,
                              isSelected && styles.selectPillActive,
                            ]}
                            onPress={() => setStep1Category(cat)}
                          >
                            <Text
                              style={[
                                styles.selectPillText,
                                isSelected && styles.selectPillTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Full Operating Address */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Shop Operating Address *</Text>
                    <TextInput
                      style={[styles.textInput, styles.textAreaInput]}
                      value={step1Address}
                      onChangeText={setStep1Address}
                      placeholder="Shop No, Building, Street, Landmark"
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* City & State Row */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>City / District *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={step1City}
                        onChangeText={setStep1City}
                        placeholder="e.g. Mumbai"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>State *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={step1State}
                        onChangeText={setStep1State}
                        placeholder="e.g. Maharashtra"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* Pincode */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>6-Digit Postal PIN Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={step1Pincode}
                      onChangeText={(t) =>
                        setStep1Pincode(t.replace(/[^0-9]/g, "").slice(0, 6))
                      }
                      placeholder="e.g. 400001"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.modalHintCard}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={styles.modalHintText}>
                      Step 1 registers your legal establishment. Step 2 (Aadhaar Auth) will unlock after saving.
                    </Text>
                  </View>

                  {/* Submit Button for Step 1 */}
                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryBtn,
                      step1Saving && styles.modalPrimaryBtnDisabled,
                    ]}
                    onPress={handleSaveStep1}
                    disabled={step1Saving}
                    activeOpacity={0.85}
                  >
                    {step1Saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={
                          isStepCompleted(1)
                            ? "checkmark-circle"
                            : "arrow-forward"
                        }
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                    <Text style={styles.modalPrimaryBtnText}>
                      {step1Saving
                        ? "Saving Step 1..."
                        : isStepCompleted(1)
                        ? "Update & Save Step 1"
                        : "Save & Complete Step 1"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Steps 2 through 7: Sequential Controlled State */
                <View style={styles.stepOverviewBody}>
                  <Text style={styles.modalDescription}>
                    {selectedStep.description}
                  </Text>

                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#0284C7" />
                    <Text style={styles.modalInfoLabel}>Estimated Time:</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedStep.timeEstimate}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Ionicons name="list-outline" size={16} color="#0284C7" />
                    <Text style={styles.modalInfoLabel}>Required Items:</Text>
                  </View>
                  <View style={styles.modalRequirementCard}>
                    <Text style={styles.modalRequirementValue}>
                      {selectedStep.whatIsNeeded}
                    </Text>
                  </View>

                  <View style={styles.modalHintCard}>
                    <Ionicons name="bulb-outline" size={16} color="#D97706" />
                    <Text style={styles.modalHintText}>
                      {selectedStep.detailsHint}
                    </Text>
                  </View>

                  <View style={styles.stepControlledNoteBox}>
                    <Ionicons name="lock-closed" size={16} color="#475569" />
                    <Text style={styles.stepControlledNoteText}>
                      {isStepCompleted(1)
                        ? `Step 1 (Basic Details) is verified! In accordance with the compliance rollout, Step ${selectedStep.id} will be unlocked once Step 1 is reviewed.`
                        : "Please complete Step 1: Basic Details first before starting this verification step."}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reusable Modern Status Modal */}
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
    width: "100%",
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  progressPercentBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  progressPercentText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.blue,
    borderRadius: 4,
  },
  progressSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  progressSummaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  timeRemainingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
  },
  spotlightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  spotlightTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  spotlightTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
    marginRight: 6,
  },
  spotlightTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.blue,
    letterSpacing: 0.5,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284C7",
  },
  spotlightContentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  spotlightIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  spotlightTextCol: {
    flex: 1,
  },
  spotlightStepNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
    textTransform: "uppercase",
  },
  spotlightStepName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy,
  },
  spotlightSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  spotlightDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 14,
  },
  spotlightActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  spotlightActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  stepListSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 10,
  },
  stepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  stepRowCompleted: {},
  stepRowCurrent: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  stepRowLocked: {
    opacity: 0.65,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  stepCircleCompleted: {
    backgroundColor: "#16A34A",
  },
  stepCircleCurrent: {
    backgroundColor: colors.blue,
  },
  stepCircleLocked: {
    backgroundColor: "#F1F5F9",
  },
  stepCircleNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  stepCircleNumberCurrent: {
    color: "#FFFFFF",
  },
  stepCircleNumberLocked: {
    color: "#94A3B8",
  },
  stepInfoCol: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  textCompleted: {
    color: "#16A34A",
  },
  textCurrent: {
    color: colors.blue,
  },
  textLocked: {
    color: "#94A3B8",
  },
  stepSubtitleText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  badgeCompleted: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeCompletedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  badgeCurrent: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeCurrentText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
  },
  badgeLocked: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeLockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  connectingLineRow: {
    paddingLeft: 13,
    height: 14,
  },
  connectingLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
  connectingLineCompleted: {
    backgroundColor: "#16A34A",
  },
  privacyNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 8,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalHeaderTextCol: {
    flex: 1,
  },
  modalStepBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  modalScrollView: {
    maxHeight: 520,
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  step1Form: {
    width: "100%",
  },
  formSectionIntro: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 14,
  },
  formErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 6,
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textAreaInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  pillSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectPill: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  selectPillTextActive: {
    color: "#FFFFFF",
  },
  stepOverviewBody: {
    width: "100%",
  },
  modalDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  modalInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modalInfoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  modalRequirementCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  modalRequirementValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  modalHintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  modalHintText: {
    fontSize: 12,
    color: "#B45309",
    flex: 1,
    lineHeight: 16,
  },
  stepControlledNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  stepControlledNoteText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 17,
  },
  modalPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
    gap: 6,
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.6,
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSecondaryBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
});
