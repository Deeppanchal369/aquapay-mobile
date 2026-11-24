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
  | "step1_done"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

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
    let step1Done = 0;
    let pending = 0;
    let underReview = 0;
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
      } else if (rec.completedSteps.includes(1)) {
        step1Done++;
      } else {
        pending++;
      }
    });

    return { all, step1Done, pending, underReview, approved, rejected };
  }, [users, getRecordForUser]);

  // Filtered applicants
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const rec = getRecordForUser(u);

      // Phase match
      if (phaseFilter === "step1_done") {
        if (!rec.completedSteps.includes(1) || rec.status === "approved" || rec.status === "rejected") {
          return false;
        }
      } else if (phaseFilter === "pending") {
        if (rec.completedSteps.length > 0 || rec.status === "approved" || rec.status === "rejected") {
          return false;
        }
      } else if (phaseFilter === "under_review") {
        if (rec.status !== "under_review" && rec.completedSteps.length < 7) {
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
      "Approve KYC & Activate Account",
      `Are you sure you want to approve KYC for ${applicant.name} (${applicant.role_name})?\n\nThis will instantly unlock account creation and team management permissions for this partner.`,
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
                title: "Applicant Approved!",
                message: `${applicant.name}'s KYC status is now APPROVED. They can now create child accounts and manage their subordinate team members.`,
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
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    const reason = rejectionReason.trim() || "Information or address details required correction.";

    try {
      const updated = await rejectKyc(rejectingUser.id, reason);
      setKycRecords((prev) => ({
        ...prev,
        [String(rejectingUser.id)]: updated,
      }));

      showNotification({
        title: "KYC Rejected",
        message: `${rejectingUser.name}'s verification was marked as rejected: ${reason}`,
        type: "warning",
        actionRoute: "/(admin)/kyc",
      });

      setRejectingUser(null);

      setStatusModal({
        visible: true,
        type: "warning",
        title: "KYC Rejected",
        message: `${rejectingUser.name}'s application has been flagged for correction. Subordinate creation remains locked.`,
        primaryButtonText: "Done",
      });
    } catch (err: any) {
      Alert.alert("Rejection Failed", err?.message || "Could not update status.");
    }
  };

  // Reset to Step 1
  const handleResetKyc = (applicant: UserItem) => {
    Alert.alert(
      "Reset KYC to Step 1",
      `Reset KYC progress for ${applicant.name}? This is useful for re-testing the 7-step onboarding flow from scratch.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset KYC",
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
                message: `${applicant.name} has been reset to Step 1 Pending.`,
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
            Applicant Queue ({users.length})
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
            7-Step Flow Preview
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "preview" ? (
        /* Preview 7-Step User Onboarding Flow */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <KycVerificationFlow />
        </ScrollView>
      ) : (
        /* Applicant Queue & Phase Tracker */
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
                phaseFilter === "step1_done" && styles.filterPillActive,
              ]}
              onPress={() => setPhaseFilter("step1_done")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  phaseFilter === "step1_done" && styles.filterPillTextActive,
                ]}
              >
                Step 1 Done ({counts.step1Done})
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
                Stuck / Pending ({counts.pending})
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
              <Text style={styles.loadingText}>Loading KYC Audit Queue...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Applicants Found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No matching applicants for "${search}" in this phase.`
                  : "No partners currently match the selected filter."}
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
                const isStep1Done = rec.completedSteps.includes(1);
                const isApproved = rec.status === "approved";
                const isRejected = rec.status === "rejected";
                const isUnderReview = rec.status === "under_review" || rec.completedSteps.length >= 7;

                // Derive exact phase label & theme
                let phaseTitle = "Phase: Stuck at Step 1 (Not Started)";
                let phaseBadgeBg = "#FEF3C7";
                let phaseTextColor = "#B45309";
                let phaseIcon: keyof typeof Ionicons.glyphMap = "alert-circle";

                if (isApproved) {
                  phaseTitle = "Phase: Approved (Full Access Unlocked)";
                  phaseBadgeBg = "#DCFCE7";
                  phaseTextColor = "#15803D";
                  phaseIcon = "checkmark-circle";
                } else if (isRejected) {
                  phaseTitle = "Phase: Rejected (Corrections Required)";
                  phaseBadgeBg = "#FEE2E2";
                  phaseTextColor = "#B91C1C";
                  phaseIcon = "close-circle";
                } else if (isUnderReview) {
                  phaseTitle = "Phase: All 7 Steps Submitted (Under Review)";
                  phaseBadgeBg = "#F3E8FF";
                  phaseTextColor = "#7E22CE";
                  phaseIcon = "hourglass-outline";
                } else if (isStep1Done) {
                  phaseTitle = "Phase: Step 1 Done • Step 2 Aadhaar Pending";
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
                        size={15}
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
                              width: `${Math.max(progressPct, 10)}%`,
                              backgroundColor: isApproved
                                ? "#16A34A"
                                : colors.blue,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPctText}>
                        {rec.completedSteps.length}/7 Steps ({progressPct}%)
                      </Text>
                    </View>

                    {/* Rejection reason hint if applicable */}
                    {isRejected && rec.rejectionReason && (
                      <View style={styles.rejectionReasonBox}>
                        <Text style={styles.rejectionReasonLabel}>Reason:</Text>
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
                          size={15}
                          color={colors.navy}
                        />
                        <Text style={styles.auditDetailsBtnText}>
                          Audit Details
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
                          <Text style={styles.resetBtnText}>Reset KYC</Text>
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
                              size={15}
                              color={colors.error}
                            />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => handleApproveKyc(applicant)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="checkmark"
                              size={15}
                              color="#FFFFFF"
                            />
                            <Text style={styles.approveBtnText}>
                              Approve KYC
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

      {/* Audit Details Modal: Inspect Submitted Step 1 Data */}
      <Modal
        visible={!!selectedAudit}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAudit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="shield-checkmark" size={22} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedAudit?.user.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedAudit?.user.role_name} • KYC Audit Record
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAudit(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Status Header */}
              <View style={styles.auditStatusCard}>
                <Text style={styles.auditStatusLabel}>Current KYC Status</Text>
                <Text
                  style={[
                    styles.auditStatusVal,
                    {
                      color:
                        selectedAudit?.record.status === "approved"
                          ? "#16A34A"
                          : selectedAudit?.record.status === "rejected"
                          ? colors.error
                          : colors.blue,
                    },
                  ]}
                >
                  {selectedAudit?.record.status?.toUpperCase() || "PENDING"}
                </Text>
                <Text style={styles.auditStatusSub}>
                  Completed: {selectedAudit?.record.completedSteps.length || 0} of 7 Stages • Active Step: {selectedAudit?.record.currentStep || 1}
                </Text>
              </View>

              {/* Step 1 Basic Details Section */}
              <Text style={styles.auditSectionHeading}>
                Step 1: Submitted Business Details
              </Text>

              {selectedAudit?.record.step1Data ? (
                <View style={styles.auditFieldsCard}>
                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Legal Owner Name:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.fullName}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Registered Shop Name:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.shopName}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Entity Type:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.entityType}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Business Category:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.category}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Operating Address:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.address}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>City & State:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.city},{" "}
                      {selectedAudit.record.step1Data.state}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Postal PIN Code:</Text>
                    <Text style={styles.auditFieldValue}>
                      {selectedAudit.record.step1Data.pincode}
                    </Text>
                  </View>

                  <View style={styles.auditFieldRow}>
                    <Text style={styles.auditFieldLabel}>Submitted At:</Text>
                    <Text style={styles.auditFieldValue}>
                      {new Date(
                        selectedAudit.record.step1Data.submittedAt
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noStep1Card}>
                  <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
                  <Text style={styles.noStep1Title}>Step 1 Not Submitted</Text>
                  <Text style={styles.noStep1Desc}>
                    This applicant has not completed or submitted their basic business details yet.
                  </Text>
                </View>
              )}

              {/* Steps 2-7 Phase Roadmap Status */}
              <Text style={styles.auditSectionHeading}>
                Verification Steps Roadmap (7 Steps)
              </Text>
              <View style={styles.roadmapCard}>
                <View style={styles.roadmapStepRow}>
                  <Ionicons
                    name={
                      selectedAudit?.record.completedSteps.includes(1)
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={18}
                    color={
                      selectedAudit?.record.completedSteps.includes(1)
                        ? "#16A34A"
                        : "#94A3B8"
                    }
                  />
                  <Text style={styles.roadmapStepText}>
                    Step 1: Basic Details ({selectedAudit?.record.completedSteps.includes(1) ? "Completed" : "Pending"})
                  </Text>
                </View>

                {[
                  "Step 2: Aadhaar Auth (UIDAI OTP)",
                  "Step 3: PAN Verification (Income Tax ID)",
                  "Step 4: Bank Details (Settlement Account)",
                  "Step 5: Media Uploads (Live Selfie & Shop)",
                  "Step 6: Agreements & Merchant Consent",
                  "Step 7: Final Review & Submission",
                ].map((stepName, i) => (
                  <View key={stepName} style={styles.roadmapStepRow}>
                    <Ionicons name="lock-closed" size={16} color="#94A3B8" />
                    <Text style={[styles.roadmapStepText, { color: "#64748B" }]}>
                      {stepName} (Controlled Review)
                    </Text>
                  </View>
                ))}
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
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
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
                  <Text style={styles.modalCloseOutlinedBtnText}>Close Audit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Dialog Modal */}
      <Modal
        visible={!!rejectingUser}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="alert" size={22} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reject KYC Application</Text>
                <Text style={styles.modalSubtitle}>
                  Applicant: {rejectingUser?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectingUser(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={styles.rejectLabel}>
                Please specify the reason for rejection / corrections:
              </Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="e.g. Shop address incomplete or PIN code mismatch..."
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
            </View>
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
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
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 8,
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
    height: 44,
    borderRadius: 12,
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
    paddingVertical: 6,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterPillText: {
    fontSize: 12,
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
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
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
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },
  previewNoticeCard: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  previewNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
  },
  previewNoticeDesc: {
    fontSize: 12,
    color: "#0C4A6E",
    marginTop: 2,
    lineHeight: 18,
  },
  applicantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  applicantAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  applicantInitials: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.blue,
  },
  applicantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    flex: 1,
  },
  roleChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.4,
  },
  applicantMetaText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  shopNameMeta: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    marginTop: 3,
  },
  phaseBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  phaseBannerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectionReasonText: {
    fontSize: 12,
    color: "#7F1D1D",
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  auditDetailsBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  auditDetailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  rejectBtn: {
    flex: 0.9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.error,
  },
  approveBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
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
    paddingVertical: 9,
    borderRadius: 8,
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollBody: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  auditStatusCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  auditStatusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  auditStatusVal: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  auditStatusSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  auditSectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  auditFieldsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  auditFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    paddingBottom: 8,
  },
  auditFieldLabel: {
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  auditFieldValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
    flex: 1.4,
    textAlign: "right",
  },
  noStep1Card: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    gap: 6,
  },
  noStep1Title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  noStep1Desc: {
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
    lineHeight: 18,
  },
  roadmapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  roadmapStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roadmapStepText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  modalActionButtons: {
    gap: 10,
    marginTop: 10,
  },
  modalApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  modalApproveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCloseOutlinedBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  modalCloseOutlinedBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  rejectLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 8,
  },
  rejectInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.navy,
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 16,
  },
  rejectActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  rejectCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  rejectConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: "center",
  },
  rejectConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
