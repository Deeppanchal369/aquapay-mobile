import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
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
  deleteUser,
  fetchDescendantRoles,
  fetchUsers,
  RoleItem,
  updateUser,
  UpdateUserInput,
  UserItem,
} from "../../api/users";
import { UserListSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";

export default function AdminUsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);

  // Edit Modal State
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editShopname, setEditShopname] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "blocked">("active");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Live mobile check in edit modal
  const [editCheckingMobile, setEditCheckingMobile] = useState(false);
  const [editMobileStatus, setEditMobileStatus] = useState<"idle" | "available" | "taken">("idle");
  const [editMobileMessage, setEditMobileMessage] = useState("");

  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [userList, roleList] = await Promise.all([
        fetchUsers({ search: search.trim() || undefined, roleId: selectedRoleId }),
        fetchDescendantRoles(),
      ]);
      setUsers(userList);
      setRoles(roleList);
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
          err?.response?.data?.message || err?.message || "Failed to load users"
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedRoleId, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (item: UserItem) => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to remove or block ${item.name} (${item.role_name})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete / Block",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteUser(item.id);
              Alert.alert("Success", res.message || "User action completed successfully");
              loadData();
            } catch (err: any) {
              Alert.alert(
                "Action Failed",
                err?.response?.data?.message || err?.message || "Could not delete user",
              );
            }
          },
        },
      ],
    );
  };

  const handleOpenEdit = (item: UserItem) => {
    setEditUser(item);
    setEditName(item.name || "");
    setEditEmail(item.email || "");
    setEditMobile(item.mobile || "");
    setEditShopname(item.shopname || "");
    setEditAddress(item.address || "");
    setEditCity(item.city || "");
    setEditState(item.state || "");
    setEditPincode(item.pincode || "");
    setEditStatus(item.status);
    setEditPassword("");
    setShowEditPassword(false);
    setEditCheckingMobile(false);
    setEditMobileStatus("idle");
    setEditMobileMessage("");
    setEditError("");
  };

  const handleCloseEdit = () => {
    setEditUser(null);
    setEditError("");
  };

  const handleEditMobileChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setEditMobile(cleaned);
    setEditError("");

    if (!editUser) return;

    if (cleaned === editUser.mobile) {
      setEditMobileStatus("idle");
      setEditMobileMessage("Current mobile number");
      return;
    }

    if (cleaned.length === 10) {
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        setEditMobileStatus("taken");
        setEditMobileMessage("Mobile number must start with 6, 7, 8, or 9");
        return;
      }

      try {
        setEditCheckingMobile(true);
        const res = await checkAvailability({ mobile: cleaned });
        if (res.available) {
          setEditMobileStatus("available");
          setEditMobileMessage("Mobile number verified & available");
        } else {
          setEditMobileStatus("taken");
          setEditMobileMessage(res.message || "Mobile number already belongs to another user");
        }
      } catch {
        setEditMobileStatus("idle");
      } finally {
        setEditCheckingMobile(false);
      }
    } else {
      setEditMobileStatus("idle");
      setEditMobileMessage("");
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditError("");

    const nameTrimmed = editName.trim();
    if (!nameTrimmed) {
      setEditError("Full name is required");
      return;
    }
    if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
      setEditError("Full name must be between 2 and 100 characters");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(nameTrimmed)) {
      setEditError("Full name must contain only letters and spaces");
      return;
    }

    const emailTrimmed = editEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setEditError("Please enter a valid email address");
      return;
    }

    const cleanMobile = editMobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setEditError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setEditError("Mobile number must start with 6, 7, 8, or 9");
      return;
    }

    if (cleanMobile !== editUser.mobile && editMobileStatus === "taken") {
      setEditError("This mobile number is already registered with another user");
      return;
    }

    if (editPassword.trim() && editPassword.trim().length < 8) {
      setEditError("New password must be at least 8 characters");
      return;
    }

    const pincodeTrimmed = editPincode.trim();
    if (pincodeTrimmed && !/^[1-9][0-9]{5}$/.test(pincodeTrimmed)) {
      setEditError("Pincode must be a valid 6-digit postal code (e.g. 400001)");
      return;
    }

    const payload: UpdateUserInput = {};

    if (nameTrimmed !== editUser.name) {
      payload.name = nameTrimmed;
    }
    if (emailTrimmed !== editUser.email.toLowerCase()) {
      payload.email = emailTrimmed;
    }
    if (cleanMobile !== editUser.mobile) {
      payload.mobile = cleanMobile;
    }
    if (editShopname.trim() !== (editUser.shopname || "")) {
      payload.shopname = editShopname.trim();
    }
    if (editAddress.trim() !== (editUser.address || "")) {
      payload.address = editAddress.trim();
    }
    if (editCity.trim() !== (editUser.city || "")) {
      payload.city = editCity.trim();
    }
    if (editState.trim() !== (editUser.state || "")) {
      payload.state = editState.trim();
    }
    if (pincodeTrimmed !== (editUser.pincode || "")) {
      payload.pincode = pincodeTrimmed;
    }
    if (editStatus !== editUser.status) {
      payload.status = editStatus;
    }
    if (editPassword.trim()) {
      payload.password = editPassword.trim();
    }

    if (Object.keys(payload).length === 0) {
      Alert.alert("Notice", "No changes were made to save.");
      handleCloseEdit();
      return;
    }

    try {
      setEditBusy(true);
      await updateUser(editUser.id, payload);
      Alert.alert(
        "User Updated",
        `Details for ${nameTrimmed} have been successfully updated.${
          payload.password ? "\n\nPassword was also updated." : ""
        }`,
      );
      handleCloseEdit();
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update user details.";
      setEditError(msg);
    } finally {
      setEditBusy(false);
    }
  };

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1:
        return { bg: colors.navy, text: "#FFFFFF" };
      case 2:
        return { bg: "#4338CA", text: "#FFFFFF" };
      case 3:
      case 4:
        return { bg: colors.blue, text: "#FFFFFF" };
      case 5:
      case 6:
        return { bg: "#0D9488", text: "#FFFFFF" };
      case 7:
        return { bg: "#D97706", text: "#FFFFFF" };
      default:
        return { bg: "#64748B", text: "#FFFFFF" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#DCFCE7", text: "#15803D", label: "Active" };
      case "blocked":
        return { bg: "#FEE2E2", text: "#B91C1C", label: "Blocked" };
      default:
        return { bg: "#FEF3C7", text: "#B45309", label: "Inactive" };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>User Directory</Text>
          <Text style={styles.headerSubtitle}>System roles & hierarchy</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(admin)/create-user" as any)}
          style={styles.addButton}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          placeholder="Search name, mobile, email..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Horizontal Role Filter Chips */}
      <View style={styles.roleFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleFilterScroll}
        >
          <TouchableOpacity
            style={[styles.roleChip, selectedRoleId === undefined && styles.roleChipActive]}
            onPress={() => setSelectedRoleId(undefined)}
          >
            <Text
              style={[
                styles.roleChipText,
                selectedRoleId === undefined && styles.roleChipTextActive,
              ]}
            >
              All Roles
            </Text>
          </TouchableOpacity>
          {roles.map((r) => {
            const isActive = selectedRoleId === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleChip, isActive && styles.roleChipActive]}
                onPress={() => setSelectedRoleId(isActive ? undefined : r.id)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    isActive && styles.roleChipTextActive,
                  ]}
                >
                  {r.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* User Cards List */}
      {loading && !refreshing ? (
        <UserListSkeleton count={4} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? "No matching users found for your search."
                  : "No users exist in this category yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleStyle = getRoleBadgeColor(item.role_id);
            const statusStyle = getStatusBadge(item.status);

            return (
              <View style={styles.userCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarLetter}>
                      {item.name?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userContact}>
                      {item.mobile} • {item.email}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                {/* Role & Parent Details */}
                <View style={styles.detailsRow}>
                  <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                      {item.role_name}
                    </Text>
                  </View>
                  {item.shopname ? (
                    <Text style={styles.detailText}>Shop: {item.shopname}</Text>
                  ) : null}
                </View>

                <View style={styles.hierarchyMeta}>
                  <Ionicons name="git-branch-outline" size={14} color={colors.muted} />
                  <Text style={styles.parentText}>
                    Created by:{" "}
                    <Text style={styles.parentName}>
                      {item.parent_name || "Head Office / Admin"}
                    </Text>
                  </Text>
                </View>

                {/* KYC & Actions Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.kycTag}>
                    <Ionicons
                      name={item.kyc?.status === "approved" ? "checkmark-circle" : "time-outline"}
                      size={14}
                      color={item.kyc?.status === "approved" ? "#16A34A" : colors.muted}
                    />
                    <Text style={styles.kycTagText}>
                      KYC: {item.kyc?.status ? item.kyc.status.toUpperCase() : "PENDING"}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(item)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.blue} />
                    </TouchableOpacity>
                    {item.role_id !== 1 ? (
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Comprehensive Edit User Modal */}
      <Modal
        visible={Boolean(editUser)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit User Profile</Text>
                <Text style={styles.modalSubtitle}>
                  {editUser?.name} • {editUser?.role_name} (ID: #{editUser?.id})
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseEdit}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Inline Error Alert */}
              {Boolean(editError) && (
                <View style={styles.modalErrorAlert}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.modalErrorText}>{editError}</Text>
                </View>
              )}

              {/* Status Section */}
              <Text style={styles.modalSectionLabel}>Account Status</Text>
              <View style={styles.statusOptionsRow}>
                {(["active", "inactive", "blocked"] as const).map((st) => {
                  const isSelected = editStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusSelectBtn,
                        isSelected && styles.statusSelectBtnActive,
                      ]}
                      onPress={() => setEditStatus(st)}
                    >
                      <Text
                        style={[
                          styles.statusSelectText,
                          isSelected && styles.statusSelectTextActive,
                        ]}
                      >
                        {st.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Personal Details */}
              <Text style={styles.modalSectionLabel}>Personal & Contact Details</Text>

              <Text style={styles.modalFieldLabel}>Full Name *</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <Text style={styles.modalFieldLabel}>Email Address *</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.modalFieldLabel}>Mobile Number *</Text>
              <View
                style={[
                  styles.modalInputWrap,
                  editMobileStatus === "available" && styles.inputSuccess,
                  editMobileStatus === "taken" && styles.inputError,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={
                    editMobileStatus === "available"
                      ? "#16A34A"
                      : editMobileStatus === "taken"
                        ? colors.error
                        : colors.muted
                  }
                  style={styles.modalIcon}
                />
                <TextInput
                  style={styles.modalInput}
                  value={editMobile}
                  onChangeText={handleEditMobileChange}
                  placeholder="10-digit mobile"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {editCheckingMobile ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : editMobileStatus === "available" ? (
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                ) : editMobileStatus === "taken" ? (
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                ) : null}
              </View>
              {editMobileMessage ? (
                <Text
                  style={[
                    styles.modalFieldHelper,
                    {
                      color:
                        editMobileStatus === "available"
                          ? "#15803D"
                          : editMobileStatus === "taken"
                            ? colors.error
                            : colors.muted,
                    },
                  ]}
                >
                  {editMobileMessage}
                </Text>
              ) : null}

              {/* Password Section */}
              <Text style={[styles.modalSectionLabel, { marginTop: 18 }]}>
                Security & Password (Admin Only)
              </Text>
              <Text style={styles.modalFieldLabel}>Reset / Change Password</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder="Enter new password (optional)"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showEditPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowEditPassword(!showEditPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showEditPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalFieldHelper}>
                Leave blank to keep current password. Minimum 8 characters if updating.
              </Text>

              {/* Merchant & Location Details */}
              <Text style={[styles.modalSectionLabel, { marginTop: 18 }]}>
                Merchant & Address Info
              </Text>

              <Text style={styles.modalFieldLabel}>Shop or Enterprise Name</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="storefront-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editShopname}
                  onChangeText={setEditShopname}
                  placeholder="Shop or business name"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <Text style={styles.modalFieldLabel}>Address</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="location-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Street / building address"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalCol}>
                  <Text style={styles.modalFieldLabel}>City</Text>
                  <View style={styles.modalInputWrap}>
                    <TextInput
                      style={styles.modalInput}
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="City"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                </View>
                <View style={styles.modalCol}>
                  <Text style={styles.modalFieldLabel}>State</Text>
                  <View style={styles.modalInputWrap}>
                    <TextInput
                      style={styles.modalInput}
                      value={editState}
                      onChangeText={setEditState}
                      placeholder="State"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.modalFieldLabel}>Pincode</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="navigate-outline" size={18} color={colors.muted} style={styles.modalIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={editPincode}
                  onChangeText={setEditPincode}
                  placeholder="6-digit PIN"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCloseEdit}
                disabled={editBusy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, editBusy && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={editBusy}
                activeOpacity={0.8}
              >
                {editBusy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderRadius: 12,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  roleFilterContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  roleFilterScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  roleChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  userContact: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  detailText: {
    fontSize: 12,
    color: colors.muted,
  },
  hierarchyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightBlue,
  },
  parentText: {
    fontSize: 12,
    color: colors.muted,
  },
  parentName: {
    fontWeight: "600",
    color: colors.text,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  kycTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  kycTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 22, 55, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.lightBlue,
  },
  modalBodyScroll: {
    maxHeight: 460,
  },
  modalErrorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
  },
  modalIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  modalFieldHelper: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    marginLeft: 4,
  },
  inputSuccess: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  eyeBtn: {
    padding: 6,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCol: {
    flex: 1,
  },
  statusOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.lightBlue,
  },
  statusSelectBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  statusSelectText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  statusSelectTextActive: {
    color: "#FFFFFF",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
