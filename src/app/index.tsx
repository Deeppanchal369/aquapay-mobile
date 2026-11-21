import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import LoginScreen from "./login";

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  // If already authenticated, redirect to appropriate role-based dashboard
  if (user) {
    const isAdmin = user.role === "admin" || user.role_id === 1;
    return <Redirect href={isAdmin ? "/(admin)/dashboard" : "/(user)/home"} />;
  }

  // When unauthenticated, show the Login page directly as the first page
  return <LoginScreen />;
}
