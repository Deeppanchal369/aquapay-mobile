import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchUsers, UserItem } from "../../api/users";
import { UserListSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";

export default function SubordinateUsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userList = await fetchUsers({ search: search.trim() || undefined });
      setUsers(userList);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to load team members");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
          <Text style={styles.headerTitle}>My Network Users</Text>
          <Text style={styles.headerSubtitle}>Members created by your account</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(user)/add-member" as any)}
          style={styles.addButton}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
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
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
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
              <Text style={styles.emptyTitle}>No Members Created Yet</Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? "No matching users found for your search."
                  : "Tap '+ Add' in the top right to create a new user under your hierarchy."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isApproved = item.kyc?.status === "approved";
            return (
              <View style={styles.userCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarLetter}>{item.name?.charAt(0)?.toUpperCase() || "U"}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userContact}>
                      {item.mobile} • {item.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === "active" ? "#DCFCE7" : "#FEE2E2" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: item.status === "active" ? "#15803D" : "#B91C1C" },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Role Pill & Shop */}
                <View style={styles.detailsRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{item.role_name}</Text>
                  </View>
                  {item.shopname ? <Text style={styles.detailText}>Shop: {item.shopname}</Text> : null}
                </View>

                {/* KYC & Date Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.kycTag}>
                    <Ionicons
                      name={isApproved ? "checkmark-circle" : "time-outline"}
                      size={14}
                      color={isApproved ? "#16A34A" : colors.muted}
                    />
                    <Text style={styles.kycTagText}>
                      KYC: {item.kyc?.status ? item.kyc.status.toUpperCase() : "PENDING"}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    Joined {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
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
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingBottom: 40,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.muted,
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
    paddingHorizontal: 20,
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
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  detailText: {
    fontSize: 12,
    color: colors.muted,
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
  dateText: {
    fontSize: 11,
    color: colors.muted,
  },
});
