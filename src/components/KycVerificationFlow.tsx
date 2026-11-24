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
  Step1Data,
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

  const [activeStep, setActiveStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Step 1 Form State
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [entityType, setEntityType] = useState(ENTITY_TYPES[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
          setCompletedSteps(record.completedSteps || []);
          setActiveStep(record.currentStep || 1);

          if (record.step1Data) {
            setFullName(record.step1Data.fullName || user?.name || "");
            setShopName(record.step1Data.shopName || user?.shopname || "");
            setEntityType(record.step1Data.entityType || ENTITY_TYPES[0]);
            setCategory(record.step1Data.category || CATEGORIES[0]);
            setAddress(record.step1Data.address || user?.address || "");
            setCity(record.step1Data.city || user?.city || "");
            setState(record.step1Data.state || user?.state || "");
            setPincode(record.step1Data.pincode || user?.pincode || "");
          } else {
            setFullName(user?.name || "");
            setShopName(user?.shopname || "");
            setAddress(user?.address || "");
            setCity(user?.city || "");
            setState(user?.state || "");
            setPincode(user?.pincode || "");
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

  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / KYC_STEPS.length) * 100);

  const handleStepPress = (step: KycStep) => {
    if (step.id === 1) {
      setFormError("");
      setModalVisible(true);
      return;
    }

    if (!completedSteps.includes(1)) {
      Alert.alert(
        "Step Locked",
        "Please complete Step 1 (Basic Details) first."
      );
      return;
    }

    Alert.alert(
      `Step ${step.id} Locked`,
      "Step 1 is completed. Step 2 will be activated once confirmed."
    );
  };

  const handleSaveStep1 = async () => {
    setFormError("");

    const nameVal = fullName.trim();
    const shopVal = shopName.trim();
    const addrVal = address.trim();
    const cityVal = city.trim();
    const stateVal = state.trim();
    const pinVal = pincode.trim();

    if (!nameVal || nameVal.length < 2) {
      setFormError("Please enter your name.");
      return;
    }
    if (!shopVal || shopVal.length < 2) {
      setFormError("Please enter your shop or business name.");
      return;
    }
    if (!addrVal || addrVal.length < 4) {
      setFormError("Please enter your address.");
      return;
    }
    if (!cityVal) {
      setFormError("Please enter your city.");
      return;
    }
    if (!stateVal) {
      setFormError("Please enter your state.");
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

      const updatedRecord = await saveStep1Kyc(effectiveUserId, data);
      setCompletedSteps(updatedRecord.completedSteps);
      setActiveStep(updatedRecord.currentStep);

      if (onStepComplete) onStepComplete(1);
      if (onKycUpdated) onKycUpdated(updatedRecord);

      showNotification({
        title: "Step 1 Completed",
        message: `${shopVal} details saved.`,
        type: "kyc",
        actionRoute: "/(admin)/kyc",
      });

      setModalVisible(false);

      setStatusModal({
        visible: true,
        type: "success",
        title: "Step 1 Completed",
        message: "Your basic business details have been saved.",
        primaryButtonText: "Done",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to save details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressTitle}>KYC Verification</Text>
          <Text style={styles.progressCounter}>
            {completedCount} of {KYC_STEPS.length} Completed
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(progressPercent, 8)}%` },
            ]}
          />
        </View>
      </View>

      {/* 7 Verification Steps List */}
      <View style={styles.stepsCard}>
        {KYC_STEPS.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isCurrent = step.id === activeStep;
          const isLocked = !isDone && !isCurrent;

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
              {/* Step Icon / Number Circle */}
              <View
                style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleDone,
                  isCurrent && styles.stepCircleActive,
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

              {/* Title & Subtitle */}
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
                  <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                  <Text style={styles.pillDoneText}>Done</Text>
                </View>
              ) : isCurrent ? (
                <View style={styles.pillActive}>
                  <Text style={styles.pillActiveText}>Start</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.blue} />
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

      {/* Step 1 Modal Form */}
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
              <View>
                <Text style={styles.modalTitle}>Basic Details</Text>
                <Text style={styles.modalSubtitle}>Step 1 of 7</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
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

              {/* Legal Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Legal Owner Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Shop Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop / Business Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Enter business name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Entity Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Type</Text>
                <View style={styles.pillsRow}>
                  {ENTITY_TYPES.map((type) => {
                    const isSelected = entityType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.selectPill,
                          isSelected && styles.selectPillActive,
                        ]}
                        onPress={() => setEntityType(type)}
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

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.pillsRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.selectPill,
                          isSelected && styles.selectPillActive,
                        ]}
                        onPress={() => setCategory(cat)}
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

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={[styles.textInput, styles.addressInput]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Shop number, street, area"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* City & State */}
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

              {/* PIN Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PIN Code *</Text>
                <TextInput
                  style={styles.textInput}
                  value={pincode}
                  onChangeText={(t) =>
                    setPincode(t.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  placeholder="6-digit PIN code"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  saving && styles.submitBtnDisabled,
                ]}
                onPress={handleSaveStep1}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {completedSteps.includes(1)
                      ? "Update Details"
                      : "Save & Continue"}
                  </Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: colors.blue,
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
