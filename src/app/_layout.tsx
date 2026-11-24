import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import InAppNotificationBanner from "../components/InAppNotificationBanner";
import { colors } from "../theme/colors";

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentSegment = segments[0];
    const inAdmin = currentSegment === "(admin)";
    const inUser = currentSegment === "(user)";

    if (!user) {
      if (inAdmin || inUser) {
        router.replace("/");
      }
    } else {
      const isAdmin = user.role === "admin" || user.role_id === 1;
      if (isAdmin && !inAdmin) {
        router.replace("/(admin)/dashboard");
      } else if (!isAdmin && !inUser) {
        router.replace("/(user)/home");
      }
    }
  }, [user, loading, segments, router]);

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(user)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Gate />
        <InAppNotificationBanner />
      </NotificationProvider>
    </AuthProvider>
  );
}
