import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";
import { useNotifications } from "../context/NotificationContext";
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
    actionButtonText: "Start Aadhaar Verification",
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
    actionButtonText: "Verify PAN Card",
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
    actionButtonText: "Add Bank Account",
    detailsHint: "A ₹1 test deposit (penny drop) will confirm your account name instantly.",
  },
  {
    id: 5,
    name: "Media Uploads",
    subtitle: "Photos & Video",
    icon: "camera-outline",
    description:
      "Take a clear selfie photograph and a photo of your shop front or office entrance to confirm physical presence.",
    timeEstimate: "~1 minute",
    whatIsNeeded: "Clear front camera selfie & shop signboard photo",
    actionButtonText: "Upload Photos",
    detailsHint: "Take the photo in good lighting with no hats or sunglasses.",
  },
  {
    id: 6,
    name: "Agreements",
    subtitle: "Terms & consent",
    icon: "document-text-outline",
    description:
      "Review the simple merchant terms of service, commission schedule, and service agreements, then confirm with a single tap.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "Read the partner summary and check the consent box",
    actionButtonText: "Review & Accept Terms",
    detailsHint: "You will receive a downloadable copy of the signed agreement via email.",
  },
  {
    id: 7,
    name: "Review & Submit",
    subtitle: "Final submission",
    icon: "checkmark-done-circle-outline",
    description:
      "Review all the verified information in one simple summary card, confirm everything is correct, and submit for account activation.",
    timeEstimate: "~30 seconds",
    whatIsNeeded: "Final confirmation of all 6 previous sections",
    actionButtonText: "Submit Verification",
    detailsHint: "Once submitted, our team reviews and activates accounts quickly.",
  },
];

interface Props {
  currentStepId?: number;
  onStepComplete?: (stepId: number) => void;
}

export default function KycVerificationFlow({
  currentStepId = 1,
  onStepComplete,
}: Props) {
  const { showNotification } = useNotifications();
  // Current active step that the user is working on (1-7)
  const [activeStep, setActiveStep] = useState<number>(currentStepId);
  // Track completed steps (step ids that are finished)
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  // Interactive modal state for previewing/completing the step
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStep, setSelectedStep] = useState<KycStep>(KYC_STEPS[0]);
  const [actionDoneMessage, setActionDoneMessage] = useState("");
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    primaryButtonText?: string;
  } | null>(null);

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
    setModalVisible(true);
  };

  const handleStartCurrentAction = () => {
    setSelectedStep(currentStepData);
    setModalVisible(true);
  };

  const handleSimulateStepCompletion = () => {
    const stepId = selectedStep.id;

    if (!completedSteps.includes(stepId)) {
      const nextCompleted = [...completedSteps, stepId];
      setCompletedSteps(nextCompleted);

      // If completing current step, advance to next
      if (stepId === activeStep && stepId < 7) {
        setActiveStep(stepId + 1);
      }
      if (onStepComplete) {
        onStepComplete(stepId);
      }
    }

    setActionDoneMessage(
      `Step ${selectedStep.id} (${selectedStep.name}) completed successfully!`
    );

    showNotification({
      title: `KYC Step ${selectedStep.id} Verified`,
      message: `${selectedStep.name} completed successfully.`,
      type: "kyc",
      actionRoute: "/(admin)/kyc",
    });

    setTimeout(() => {
      setActionDoneMessage("");
      setModalVisible(false);
    }, 900);
  };

  return (
    <View style={styles.container}>
      {/* Top Progress & Status Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              STEP {activeStep} OF {KYC_STEPS.length}
            </Text>
          </View>
          <Text style={styles.progressPercentText}>
            {progressPercent}% Completed
          </Text>
        </View>

        <Text style={styles.headerTitle}>Account Verification</Text>
        <Text style={styles.headerSubtitle}>
          Complete these simple steps to activate full merchant payments &
          services for your shop.
        </Text>

        {/* Progress Bar Track */}
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
            ⏱️ ~3 to 4 mins total
          </Text>
        </View>
      </View>

      {/* The Spotlight Card: Big, unmistakable "Do this next" card */}
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

        <View style={styles.requirementBox}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#0369A1"
          />
          <Text style={styles.requirementText}>
            {currentStepData.whatIsNeeded}
          </Text>
        </View>

        {/* Main Big Action Button */}
        <TouchableOpacity
          style={styles.mainActionButton}
          onPress={handleStartCurrentAction}
          activeOpacity={0.85}
        >
          <Text style={styles.mainActionButtonText}>
            {currentStepData.actionButtonText}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Full 7-Step Checklist */}
      <View style={styles.checklistCard}>
        <View style={styles.checklistHeaderRow}>
          <Text style={styles.checklistTitle}>All Verification Steps</Text>
          <Text style={styles.checklistSub}>Tap any step to see details</Text>
        </View>

        {KYC_STEPS.map((step, index) => {
          const completed = isStepCompleted(step.id);
          const current = isStepCurrent(step.id);
          const locked = isStepLocked(step.id);

          return (
            <React.Fragment key={step.id}>
              <TouchableOpacity
                style={[
                  styles.stepRow,
                  current && styles.stepRowCurrent,
                  completed && styles.stepRowCompleted,
                ]}
                onPress={() => handleStepPress(step)}
                activeOpacity={locked ? 0.9 : 0.7}
              >
                {/* Left Indicator Circle */}
                <View
                  style={[
                    styles.stepStatusCircle,
                    completed && styles.circleCompleted,
                    current && styles.circleCurrent,
                    locked && styles.circleLocked,
                  ]}
                >
                  {completed ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : current ? (
                    <Text style={styles.circleNumberCurrent}>{step.id}</Text>
                  ) : (
                    <Ionicons
                      name="lock-closed"
                      size={13}
                      color="#94A3B8"
                    />
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

              {/* Connecting line between steps */}
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
            </React.Fragment>
          );
        })}
      </View>

      {/* Honest, Human-Crafted Security & Privacy Note */}
      <View style={styles.privacyNoteCard}>
        <Ionicons name="shield-checkmark" size={18} color="#059669" />
        <Text style={styles.privacyNoteText}>
          Your details are stored safely and used only for verifying your AquaPay
          merchant account.
        </Text>
      </View>

      {/* Step Detail Modal */}
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

            {/* Modal Body */}
            <View style={styles.modalBody}>
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
                <Ionicons
                  name="bulb-outline"
                  size={16}
                  color="#D97706"
                />
                <Text style={styles.modalHintText}>
                  {selectedStep.detailsHint}
                </Text>
              </View>

              {actionDoneMessage ? (
                <View style={styles.modalSuccessBanner}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#16A34A"
                  />
                  <Text style={styles.modalSuccessText}>
                    {actionDoneMessage}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSecondaryBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  isStepCompleted(selectedStep.id) &&
                    styles.modalPrimaryBtnCompleted,
                ]}
                onPress={handleSimulateStepCompletion}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={
                    isStepCompleted(selectedStep.id)
                      ? "checkmark-circle"
                      : "arrow-forward"
                  }
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.modalPrimaryBtnText}>
                  {isStepCompleted(selectedStep.id)
                    ? "Mark as Verified"
                    : selectedStep.actionButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern Notice / Status Modal */}
      {statusModal ? (
        <StatusModal
          visible={statusModal.visible}
          type={statusModal.type || "info"}
          title={statusModal.title}
          message={statusModal.message}
          primaryButtonText={statusModal.primaryButtonText || "Done"}
          onPrimaryPress={() => setStatusModal(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // Header Card
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.blue,
    borderRadius: 8,
  },
  progressSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSummaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  timeRemainingText: {
    fontSize: 12,
    color: "#64748B",
  },

  // Spotlight Card: Highlights the current task
  spotlightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: "#38BDF8",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  spotlightTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  spotlightTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0284C7",
  },
  spotlightTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
    letterSpacing: 0.4,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  spotlightContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  spotlightIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightTextCol: {
    flex: 1,
  },
  spotlightStepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
    textTransform: "uppercase",
  },
  spotlightStepName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy,
  },
  spotlightSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  spotlightDescription: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginBottom: 12,
  },
  requirementBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    color: "#0369A1",
    lineHeight: 16,
  },
  mainActionButton: {
    backgroundColor: colors.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  mainActionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Checklist Card
  checklistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checklistHeaderRow: {
    marginBottom: 14,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  checklistSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  stepRowCurrent: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  stepRowCompleted: {
    backgroundColor: "#F8FAFC",
  },
  stepStatusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  circleCompleted: {
    backgroundColor: "#16A34A",
  },
  circleCurrent: {
    backgroundColor: colors.blue,
  },
  circleLocked: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  circleNumberCurrent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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
    fontWeight: "600",
    color: colors.navy,
  },
  textCompleted: {
    color: "#16A34A",
  },
  textCurrent: {
    color: "#0369A1",
    fontWeight: "700",
  },
  textLocked: {
    color: "#64748B",
  },
  stepSubtitleText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },

  // Status Badges
  badgeCompleted: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeCompletedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  badgeCurrent: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCurrentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  badgeLocked: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  badgeLockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },

  connectingLineRow: {
    paddingLeft: 23,
    height: 12,
    justifyContent: "center",
  },
  connectingLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
  connectingLineCompleted: {
    backgroundColor: "#86EFAC",
  },

  // Privacy note
  privacyNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 10,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTextCol: {
    flex: 1,
  },
  modalStepBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
    letterSpacing: 0.5,
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
  },
  modalBody: {
    paddingVertical: 16,
    gap: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalInfoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalInfoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  modalRequirementCard: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalRequirementValue: {
    fontSize: 13,
    color: "#1E293B",
  },
  modalHintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    gap: 8,
  },
  modalHintText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  modalSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  modalSuccessText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
  },
  modalSecondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: colors.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalPrimaryBtnCompleted: {
    backgroundColor: "#16A34A",
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
