import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { View, Text, StyleSheet, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AuthProvider } from "../context/AuthContext";
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Prevent auto hide so we can wait for fonts to load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setTimeout(() => {
        setShowSplash(false);
      }, 2500); // Show our custom splash for 2.5s
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (showSplash) {
    // Array of MaterialIcons known to exist
    const backgroundIcons = [
      'construction', 'architecture', 'handyman', 'plumbing', 
      'engineering', 'hardware', 'build', 'carpenter', 'format-paint',
      'construction', 'architecture', 'handyman', 'plumbing', 
      'engineering', 'hardware', 'build', 'carpenter', 'format-paint'
    ];

    return (
      <View style={styles.splashContainer}>
        {/* Background Decorative Element */}
        <View style={styles.patternContainer}>
          {backgroundIcons.map((icon, index) => (
             <MaterialIcons key={index} name={icon as any} size={64} color="rgba(255,255,255,0.03)" style={{ margin: 16 }} />
          ))}
        </View>

        <View style={styles.contentContainer}>
          {/* Minimal Geometric Tool/Wrench Logo */}
          <View style={styles.logoBox}>
            <Image 
              source={require('../../assets/images/app-icon/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Brand Identity */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Karigar.ai</Text>
            <Text style={styles.subtitle}>Smart services. Transparent decisions.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#0d7377",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  contentContainer: {
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 20,
  },
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 24,
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 32,
    color: "white",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  patternContainer: {
    position: "absolute",
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    transform: [{ rotate: "-12deg" }, { scale: 1.5 }],
  }
});
