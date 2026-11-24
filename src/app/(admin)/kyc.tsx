import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchUsers, UserItem } from "../../api/users";
import KycVerificationFlow from "../../components/KycVerificationFlow";
import StatusModal from "../../components/StatusModal";
import { useNotifications } from "../../context/NotificationContext";
import { colors } from "../../theme/colors";
import {
  approveKyc,
  getAllKycRecords,
  rejectKyc,
  resetUserKyc,
  UserKycRecord,
} from "../../utils/kycStore";

type PhaseFilter =
  | "all"
  | "under_review"
  | "in_progress"
  | "pending"
  | "approved"
  | "rejected";

const REJECTABLE_STEPS = [
  { id: 0, label: "General / All Steps" },
  { id: 1, label: "Step 1: Basic Details" },
  { id: 2, label: "Step 2: Aadhaar Auth" },
  { id: 3, label: "Step 3: PAN Card" },
  { id: 4, label: "Step 4: Bank Account" },
  { id: 5, label: "Step 5: Photos & Media" },
  { id: 6, label: "Step 6: Agreement" },
];

export default function AdminKycAuditScreen() {
  const router = useRouter();
  const { showNotification } = useNotifications();

  // Mode: "queue" (audit applicant records) or "preview" (see 7-step onboarding UI)
  const [activeTab, setActiveTab] = useState<"queue" | "preview">("queue");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [kycRecords, setKycRecords] = useState<Record<string, UserKycRecord>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");

  // Audit Modal State
  const [selectedAudit, setSelectedAudit] = useState<{
    user: UserItem;
    record: UserKycRecord;
  } | null>(null);

  // Rejection Dialog State
  const [rejectingUser, setRejectingUser] = useState<UserItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectStep, setRejectStep] = useState<number>(0);

  // Feedback Status Modal
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    primaryButtonText?: string;
  } | null>(null);

  const getRecordForUser = useCallback(
    (targetUser: UserItem): UserKycRecord => {
      const key = String(targetUser.id);
      if (kycRecords[key]) {
        return kycRecords[key];
      }
      return {
        userId: targetUser.id,
        status: "pending",
        completedSteps: [],
        currentStep: 1,
        updatedAt: targetUser.created_at || new Date().toISOString(),
      };
    },
    [kycRecords]
  );

  const refreshQueue = useCallback(async () => {
    try {
      setRefreshing(true);
      const [userList, records] = await Promise.all([
        fetchUsers(),
        getAllKycRecords(),
      ]);

      const nonAdminUsers = userList.filter(
        (u) =>
          u.role_slug !== "admin" &&
          u.role_slug !== "super_admin" &&
          u.role_slug !== "support"
      );
      setUsers(nonAdminUsers);
      setKycRecords(records);
    } catch (err: any) {
      Alert.alert(
        "Failed to Load Queue",
        err?.response?.data?.message || err?.message || "Could not fetch users"
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initQueue() {
      try {
        const [userList, records] = await Promise.all([
          fetchUsers(),
          getAllKycRecords(),
        ]);
        if (isMounted) {
          const nonAdminUsers = userList.filter(
            (u) =>
              u.role_slug !== "admin" &&
              u.role_slug !== "super_admin" &&
              u.role_slug !== "support"
          );
          setUsers(nonAdminUsers);
          setKycRecords(records);
        }
      } catch (err: any) {
        if (isMounted) {
          Alert.alert(
            "Failed to Load Queue",
            err?.response?.data?.message || err?.message || "Could not fetch users"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    initQueue();
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = () => {
    refreshQueue();
  };

  // Quick filter counts
  const counts = useMemo(() => {
    let all = users.length;
    let underReview = 0;
    let inProgress = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    users.forEach((u) => {
      const rec = getRecordForUser(u);
      if (rec.status === "approved") {
        approved++;
      } else if (rec.status === "rejected") {
        rejected++;
      } else if (rec.status === "under_review" || rec.completedSteps.length >= 7) {
        underReview++;
      } else if (rec.completedSteps.length > 0) {
        inProgress++;
      } else {
        pending++;
      }
    });

    return { all, underReview, inProgress, pending, approved, rejected };
  }, [users, getRecordForUser]);

  // Filtered applicants
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const rec = getRecordForUser(u);

      if (phaseFilter === "under_review") {
        if (rec.status !== "under_review" && rec.completedSteps.length < 7) {
          return false;
        }
      } else if (phaseFilter === "in_progress") {
        if (
          rec.completedSteps.length === 0 ||
          rec.completedSteps.length >= 7 ||
          rec.status === "approved" ||
          rec.status === "rejected" ||
          rec.status === "under_review"
        ) {
          return false;
        }
      } else if (phaseFilter === "pending") {
        if (
          rec.completedSteps.length > 0 ||
          rec.status === "approved" ||
          rec.status === "rejected" ||
          rec.status === "under_review"
        ) {
          return false;
        }
      } else if (phaseFilter === "approved") {
        if (rec.status !== "approved") return false;
      } else if (phaseFilter === "rejected") {
        if (rec.status !== "rejected") return false;
      }

      // Search match
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchMobile = u.mobile?.includes(q);
        const matchShop = (u.shopname || rec.step1Data?.shopName)?.toLowerCase().includes(q);
        const matchRole = u.role_name?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchMobile && !matchShop && !matchRole) {
          return false;
        }
      }

      return true;
    });
  }, [users, getRecordForUser, phaseFilter, search]);

  // Approve action
  const handleApproveKyc = (applicant: UserItem) => {
    Alert.alert(
      "Approve KYC Application",
      `Are you sure you want to approve KYC for ${applicant.name} (${applicant.role_name})?\n\nThis will activate child account creation and team permissions for this partner.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Approval",
          style: "default",
          onPress: async () => {
            try {
              const updated = await approveKyc(applicant.id);
              setKycRecords((prev) => ({
                ...prev,
                [String(applicant.id)]: updated,
              }));

              showNotification({
                title: "KYC Approved",
                message: `${applicant.name}'s KYC has been approved. Account permissions unlocked.`,
                type: "kyc",
                actionRoute: "/(admin)/kyc",
              });

              setStatusModal({
                visible: true,
                type: "success",
                title: "Applicant Approved",
                message: `${applicant.name}'s KYC status is now APPROVED. They can now add subordinate accounts and manage their network.`,
                primaryButtonText: "Done",
              });
            } catch (err: any) {
              Alert.alert("Approval Failed", err?.message || "Could not update status.");
            }
          },
        },
      ]
    );
  };

  // Reject action
  const handleOpenReject = (applicant: UserItem) => {
    setRejectingUser(applicant);
    setRejectionReason("");
    setRejectStep(0);
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    const stepLabel = rejectStep > 0 ? `Step ${rejectStep}` : "Documents";
    const reason = rejectionReason.trim() || `${stepLabel} require correction.`;

    try {
      const updated = await rejectKyc(
        rejectingUser.id,
        reason,
        rejectStep > 0 ? rejectStep : undefined
      );
      setKycRecords((prev) => ({
        ...prev,
        [String(rejectingUser.id)]: updated,
      }));

      showNotification({
        title: "KYC Rejected",
        message: `${rejectingUser.name}'s application marked for correction: ${reason}`,
        type: "warning",
        actionRoute: "/(admin)/kyc",
      });

      setRejectingUser(null);

      setStatusModal({
        visible: true,
        type: "warning",
        title: "KYC Flagged for Correction",
        message: `${rejectingUser.name} will be shown: "${reason}". They can update the step and re-submit.`,
        primaryButtonText: "Done",
      });
    } catch (err: any) {
      Alert.alert("Rejection Failed", err?.message || "Could not update status.");
    }
  };

  // Reset to Step 1
  const handleResetKyc = (applicant: UserItem) => {
    Alert.alert(
      "Reset KYC",
      `Reset KYC progress for ${applicant.name}? This allows testing from scratch.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const reset = await resetUserKyc(applicant.id);
              setKycRecords((prev) => ({
                ...prev,
                [String(applicant.id)]: reset,
              }));

              setStatusModal({
                visible: true,
                type: "info",
                title: "KYC Reset",
                message: `${applicant.name} has been reset.`,
                primaryButtonText: "OK",
              });
            } catch (err: any) {
              Alert.alert("Reset Failed", err?.message || "Could not reset.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>KYC Applications</Text>
          <Text style={styles.headerSubtitle}>
            Review and approve partner verification
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={18} color={colors.navy} />
        </TouchableOpacity>
      </View>

      {/* Top Tab Mode Switcher: Applicant Queue vs. Flow Preview */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "queue" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("queue")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "queue" ? colors.blue : "#64748B"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "queue" && styles.tabTextActive,
            ]}
          >
            Applications ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "preview" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("preview")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={activeTab === "preview" ? colors.blue : "#64748B"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "preview" && styles.tabTextActive,
            ]}
          >
            User Flow Preview
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "preview" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <KycVerificationFlow />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search Input Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, mobile, shop or role..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Phase Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "all" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("all")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "all" && styles.filterPillTextActive,
                ]}
              >
                All ({counts.all})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "under_review" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("under_review")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "under_review" && styles.filterPillTextActive,
                ]}
              >
                Under Review ({counts.underReview})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "in_progress" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("in_progress")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "in_progress" && styles.filterPillTextActive,
                ]}
              >
                In Progress ({counts.inProgress})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "pending" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("pending")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "pending" && styles.filterPillTextActive,
                ]}
              >
                Not Started ({counts.pending})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "approved" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("approved")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "approved" && styles.filterPillTextActive,
                ]}
              >
                Approved ({counts.approved})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                phaseFilter === "rejected" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("rejected")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "rejected" && styles.filterPillTextActive,
                ]}
              >
                Rejected ({counts.rejected})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Applicant Cards List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.blue} />
              <Text style={styles.loadingText}>Loading Applications...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Applications Found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No matching records for "${search}".`
                  : "No partners currently in this filter."}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            >
              {filteredUsers.map((applicant) => {
                const rec = getRecordForUser(applicant);
                const isApproved = rec.status === "approved";
                const isRejected = rec.status === "rejected";
                const isUnderReview = rec.status === "under_review" || rec.completedSteps.length >= 7;

                let phaseTitle = "Not Started";
                let phaseBadgeBg = "#F1F5F9";
                let phaseTextColor = "#64748B";
                let phaseIcon: keyof typeof Ionicons.glyphMap = "ellipse-outline";

                if (isApproved) {
                  phaseTitle = "Approved & Active";
                  phaseBadgeBg = "#DCFCE7";
                  phaseTextColor = "#15803D";
                  phaseIcon = "checkmark-circle";
                } else if (isRejected) {
                  phaseTitle = rec.rejectedStep
                    ? `Rejected (Fix Step ${rec.rejectedStep})`
                    : "Rejected (Action Needed)";
                  phaseBadgeBg = "#FEE2E2";
                  phaseTextColor = "#B91C1C";
                  phaseIcon = "close-circle";
                } else if (isUnderReview) {
                  phaseTitle = "All 7 Steps Completed • Ready to Review";
                  phaseBadgeBg = "#F3E8FF";
                  phaseTextColor = "#7E22CE";
                  phaseIcon = "hourglass-outline";
                } else if (rec.completedSteps.length > 0) {
                  phaseTitle = `In Progress (${rec.completedSteps.length}/7 Completed)`;
                  phaseBadgeBg = "#E0F2FE";
                  phaseTextColor = "#0369A1";
                  phaseIcon = "time";
                }

                const progressPct = Math.round((rec.completedSteps.length / 7) * 100);

                return (
                  <View key={applicant.id} style={styles.applicantCard}>
                    {/* Top Row: User identity & Status Badge */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.applicantAvatarBox}>
                        <Text style={styles.applicantInitials}>
                          {applicant.name
                            ? applicant.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "AP"}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.applicantNameRow}>
                          <Text style={styles.applicantName}>
                            {applicant.name}
                          </Text>
                          <View style={styles.roleChip}>
                            <Text style={styles.roleChipText}>
                              {applicant.role_name || "PARTNER"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.applicantMetaText}>
                          {applicant.email} • {applicant.mobile}
                        </Text>
                        {applicant.shopname || rec.step1Data?.shopName ? (
                          <Text style={styles.shopNameMeta}>
                            🏪 {rec.step1Data?.shopName || applicant.shopname}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Phase Status Banner */}
                    <View
                      style={[
                        styles.phaseBanner,
                        { backgroundColor: phaseBadgeBg },
                      ]}
                    >
                      <Ionicons
                        name={phaseIcon}
                        size={14}
                        color={phaseTextColor}
                      />
                      <Text
                        style={[
                          styles.phaseBannerText,
                          { color: phaseTextColor },
                        ]}
                      >
                        {phaseTitle}
                      </Text>
                    </View>

                    {/* Progress Bar Row */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.max(progressPct, 5)}%`,
                              backgroundColor: isApproved
                                ? "#16A34A"
                                : isUnderReview
                                ? "#9333EA"
                                : colors.blue,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPctText}>
                        {rec.completedSteps.length}/7 Steps
                      </Text>
                    </View>

                    {/* Rejection reason hint if applicable */}
                    {isRejected && rec.rejectionReason && (
                      <View style={styles.rejectionReasonBox}>
                        <Text style={styles.rejectionReasonLabel}>
                          Rejection Reason:
                        </Text>
                        <Text style={styles.rejectionReasonText}>
                          {rec.rejectionReason}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.auditDetailsBtn}
                        onPress={() =>
                          setSelectedAudit({ user: applicant, record: rec })
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={14}
                          color={colors.navy}
                        />
                        <Text style={styles.auditDetailsBtnText}>
                          View Details
                        </Text>
                      </TouchableOpacity>

                      {isApproved ? (
                        <TouchableOpacity
                          style={styles.resetBtn}
                          onPress={() => handleResetKyc(applicant)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="refresh-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.resetBtnText}>Reset</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => handleOpenReject(applicant)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="close"
                              size={14}
                              color={colors.error}
                            />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.approveBtn,
                              !isUnderReview && styles.approveBtnSecondary,
                            ]}
                            onPress={() => handleApproveKyc(applicant)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                            <Text style={styles.approveBtnText}>
                              {isUnderReview ? "Approve KYC" : "Approve"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Audit Details Modal: Inspect ALL 7 Submitted Steps */}
      <Modal
        visible={!!selectedAudit}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAudit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedAudit?.user.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedAudit?.user.role_name} • KYC Submitted Details
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAudit(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Status Header */}
              <View style={styles.auditStatusCard}>
                <Text style={styles.auditStatusLabel}>Status</Text>
                <Text
                  style={[
                    styles.auditStatusVal,
                    {
                      color:
                        selectedAudit?.record.status === "approved"
                          ? "#16A34A"
                          : selectedAudit?.record.status === "rejected"
                          ? colors.error
                          : selectedAudit?.record.status === "under_review"
                          ? "#7E22CE"
                          : colors.blue,
                    },
                  ]}
                >
                  {selectedAudit?.record.status?.toUpperCase() || "PENDING"}
                </Text>
                <Text style={styles.auditStatusSub}>
                  {selectedAudit?.record.completedSteps.length || 0} of 7 Steps Completed
                </Text>
              </View>

              {/* Step 1: Basic Details */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>1. Basic Details</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step1Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step1Data ? "Completed" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step1Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Legal Owner:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step1Data.fullName}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Shop Name:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step1Data.shopName}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Business Type:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step1Data.entityType} • {selectedAudit.record.step1Data.category}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Address:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step1Data.address}, {selectedAudit.record.step1Data.city}, {selectedAudit.record.step1Data.state} - {selectedAudit.record.step1Data.pincode}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Step 2: Aadhaar */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>2. Aadhaar Auth</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step2Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step2Data ? "Verified" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step2Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Aadhaar Number:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step2Data.aadhaarNumber}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>UIDAI OTP Status:</Text>
                      <Text style={[styles.auditFieldValue, { color: "#16A34A" }]}>
                        Verified Successfully
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Step 3: PAN */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>3. PAN Card</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step3Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step3Data ? "Verified" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step3Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>PAN Number:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step3Data.panNumber}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Date of Birth:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step3Data.dob}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Step 4: Bank Account */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>4. Settlement Bank</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step4Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step4Data ? "Linked" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step4Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Bank Name:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step4Data.bankName}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Account Number:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step4Data.accountNumber}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>IFSC Code:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step4Data.ifscCode}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Account Holder:</Text>
                      <Text style={styles.auditFieldValue}>
                        {selectedAudit.record.step4Data.accountHolderName}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Step 5: Media */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>5. Photos & Media</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step5Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step5Data ? "Attached" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step5Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Merchant Selfie:</Text>
                      <Text style={[styles.auditFieldValue, { color: "#16A34A" }]}>
                        ✓ {selectedAudit.record.step5Data.selfieImage}
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Shop Front Photo:</Text>
                      <Text style={[styles.auditFieldValue, { color: "#16A34A" }]}>
                        ✓ {selectedAudit.record.step5Data.shopFrontImage}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Step 6: Agreements */}
              <View style={styles.auditStepBlock}>
                <View style={styles.auditStepBlockHeader}>
                  <Text style={styles.auditStepBlockTitle}>6. Agreements & Declarations</Text>
                  <Text
                    style={[
                      styles.auditStepBadge,
                      selectedAudit?.record.step6Data && styles.auditStepBadgeDone,
                    ]}
                  >
                    {selectedAudit?.record.step6Data ? "Accepted" : "Pending"}
                  </Text>
                </View>

                {selectedAudit?.record.step6Data ? (
                  <View style={styles.auditFieldsCard}>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Merchant Terms:</Text>
                      <Text style={[styles.auditFieldValue, { color: "#16A34A" }]}>
                        ✓ Accepted
                      </Text>
                    </View>
                    <View style={styles.auditFieldRow}>
                      <Text style={styles.auditFieldLabel}>Truth Declaration:</Text>
                      <Text style={[styles.auditFieldValue, { color: "#16A34A" }]}>
                        ✓ Accepted
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.auditEmptyText}>Not submitted yet.</Text>
                )}
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActionButtons}>
                {selectedAudit?.record.status !== "approved" ? (
                  <TouchableOpacity
                    style={styles.modalApproveBtn}
                    onPress={() => {
                      if (selectedAudit) {
                        const target = selectedAudit.user;
                        setSelectedAudit(null);
                        handleApproveKyc(target);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.modalApproveBtnText}>
                      Approve This Applicant
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.modalCloseOutlinedBtn}
                  onPress={() => setSelectedAudit(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseOutlinedBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Dialog Modal with Step Pinpointing */}
      <Modal
        visible={!!rejectingUser}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 480 }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="alert" size={20} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reject Application</Text>
                <Text style={styles.modalSubtitle}>
                  {rejectingUser?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectingUser(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.rejectLabel}>
                Which step requires correction?
              </Text>
              <View style={styles.rejectStepPillsRow}>
                {REJECTABLE_STEPS.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.rejectStepPill,
                      rejectStep === s.id && styles.rejectStepPillActive,
                    ]}
                    onPress={() => setRejectStep(s.id)}
                  >
                    <Text
                      style={[
                        styles.rejectStepPillText,
                        rejectStep === s.id && styles.rejectStepPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.rejectLabel, { marginTop: 12 }]}>
                Reason to show to user:
              </Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="e.g. Shop address mismatch, invalid bank IFSC, etc."
                placeholderTextColor="#94A3B8"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.rejectActionRow}>
                <TouchableOpacity
                  style={styles.rejectCancelBtn}
                  onPress={() => setRejectingUser(null)}
                >
                  <Text style={styles.rejectCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectConfirmBtn}
                  onPress={handleConfirmReject}
                >
                  <Text style={styles.rejectConfirmBtnText}>
                    Confirm Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Modal for Action Feedback */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
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
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 6,
  },
  tabItemActive: {
    borderBottomColor: colors.blue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: colors.blue,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
  },
  filterPillsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },
  applicantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  applicantAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  applicantInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.blue,
  },
  applicantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  applicantName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    flex: 1,
  },
  roleChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  applicantMetaText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  shopNameMeta: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    marginTop: 2,
  },
  phaseBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
    marginBottom: 8,
  },
  phaseBannerText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPctText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  rejectionReasonBox: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectionReasonText: {
    fontSize: 11,
    color: "#7F1D1D",
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  auditDetailsBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  auditDetailsBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  rejectBtn: {
    flex: 0.9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  approveBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  approveBtnSecondary: {
    backgroundColor: colors.blue,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
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
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollBody: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  auditStatusCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  auditStatusLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
  },
  auditStatusVal: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  auditStatusSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  auditStepBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  auditStepBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  auditStepBlockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  auditStepBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  auditStepBadgeDone: {
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  auditFieldsCard: {
    gap: 6,
  },
  auditFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  auditFieldLabel: {
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  auditFieldValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.navy,
    flex: 1.5,
    textAlign: "right",
  },
  auditEmptyText: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  modalActionButtons: {
    gap: 8,
    marginTop: 6,
  },
  modalApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modalApproveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCloseOutlinedBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  modalCloseOutlinedBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  rejectLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 6,
  },
  rejectStepPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rejectStepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  rejectStepPillActive: {
    backgroundColor: colors.error,
  },
  rejectStepPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  rejectStepPillTextActive: {
    color: "#FFFFFF",
  },
  rejectInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: colors.navy,
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 14,
  },
  rejectActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  rejectCancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  rejectConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: "center",
  },
  rejectConfirmBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
