import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="team" />
      <Stack.Screen name="add-member" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
