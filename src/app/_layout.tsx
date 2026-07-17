import { useAuthStore } from '@/state/auth-store'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

function RootNavigation() {
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)
  const initialize = useAuthStore((s) => s.initialize)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = initialize()
    return () => unsubscribe()
  }, [initialize])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inCallback = segments[0] === 'auth'

    // Let the authentication callback screen handle its deep link exchanges first
    if (inCallback) return

    if (!session && !inAuthGroup) {
      // Not logged in -> go to sign-in screen
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      // Logged in -> go to dashboard
      router.replace('/(tabs)')
    }
  }, [session, isLoading, segments])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0c' }}>
        <ActivityIndicator size="large" color="#bdf06e" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0c' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
