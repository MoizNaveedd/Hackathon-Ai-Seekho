import { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Link } from "expo-router";
import HomeScreen from "../components/HomeScreen";
import { useAuth } from "../context/AuthContext";
import { updateUserLocation } from "../services/apiService";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Google Sign-In web client ID
// ─────────────────────────────────────────────
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

export default function Index() {
  const { authUser, isLoading, handleGoogleSignIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  // ── Configure Google Sign-In once ──────────────────────────────────────
  useEffect(() => {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  }, []);

  // ── Update location whenever a logged-in session is active ─────────────
  useEffect(() => {
    if (!authUser?.backendUser?.user?.id || authUser.backendUser.user.id === -1) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("📍 Location permission denied – skipping /update_user_location");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        console.log(`📍 Got location: ${latitude}, ${longitude}`);
        await updateUserLocation(authUser.backendUser.user.id, latitude, longitude);
        console.log("✅ /update_user_location success");
      } catch (err) {
        // Non-fatal – don't block the user experience
        console.warn("⚠️ Could not update user location:", err);
      }
    })();
  }, [authUser?.backendUser?.user?.id]);

  // ── Google Sign-In handler ──────────────────────────────────────────────
  const signIn = async () => {
    try {
      setSigningIn(true);
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      console.log("✨ Google Sign-In success:", JSON.stringify(result, null, 2));

      // Build the GoogleUserData shape expected by /sso_login
      const googleData = {
        user: {
          id: result.data?.user?.id ?? "",
          email: result.data?.user?.email ?? "",
          name: result.data?.user?.name ?? "",
          givenName: result.data?.user?.givenName ?? null,
          familyName: result.data?.user?.familyName ?? null,
          photo: result.data?.user?.photo ?? null,
        },
        scopes: result.data?.scopes ?? null,
        serverAuthCode: result.data?.serverAuthCode ?? null,
        idToken: result.data?.idToken ?? null,
      };

      // Delegates to AuthContext: calls /sso_login and persists session
      await handleGoogleSignIn(googleData);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed — no alert needed
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Hold on", "Sign in is already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services are not available or outdated.");
      } else {
        Alert.alert("Sign In Failed", error.message || "An unknown error occurred.");
        console.error("Sign-in error:", error);
      }
    } finally {
      setSigningIn(false);
    }
  };

  // ── Loading state (restoring session from AsyncStorage) ─────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00595c" />
      </View>
    );
  }

  // ── User is signed in → show Home ────────────────────────────────────────
  if (authUser) {
    return <HomeScreen user={authUser} onSignOut={signOut} />;
  }

  // ── Not signed in → show Login screen ────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Top 40%: Branding Canvas */}
      <View style={styles.heroSection}>
        <View style={styles.decorativeCircle} />
        <View style={styles.primaryCircle}>
          <View style={styles.dashedRing} />
        </View>

        <View style={styles.identityAnchor}>
          <View style={styles.logoBox}>
            <MaterialIcons name="construction" size={40} color="#00595c" />
          </View>
          <Text style={styles.heroTitle}>Karigar.ai</Text>
        </View>
      </View>

      {/* Middle: Welcome Content */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome to Karigar.ai</Text>
        <Text style={styles.welcomeSubtitle}>Find trusted service providers in seconds</Text>
      </View>

      {/* Bottom: Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.googleButton, signingIn && styles.googleButtonDisabled]}
          onPress={signIn}
          activeOpacity={0.8}
          disabled={signingIn}
        >
          {signingIn ? (
            <ActivityIndicator size="small" color="#00595c" style={{ marginRight: 12 }} />
          ) : (
            <Image
              source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
              style={styles.googleIcon}
              resizeMode="contain"
            />
          )}
          <Text style={styles.googleButtonText}>
            {signingIn ? "Signing in…" : "Continue with Google"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer Terms */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to Karigar.ai's{"\n"}
          <Link href="/terms" asChild>
            <Text style={styles.linkText}>Terms of Service</Text>
          </Link>{" "}
          and{" "}
          <Link href="/terms" asChild>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Link>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  heroSection: {
    height: 450,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  decorativeCircle: {
    position: "absolute",
    top: -46,
    left: -48,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0,89,92,0.1)",
  },
  primaryCircle: {
    position: "absolute",
    top: -110,
    right: -80,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "#00595c",
    justifyContent: "center",
    alignItems: "center",
  },
  dashedRing: {
    position: "absolute",
    top: 32,
    bottom: 32,
    left: 32,
    right: 32,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: "rgba(13,115,119,0.2)",
    borderStyle: "dashed",
  },
  identityAnchor: {
    alignItems: "center",
    zIndex: 10,
    marginTop: -10,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  heroTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: -0.5,
  },
  welcomeSection: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  welcomeTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 20,
    color: "#1a1a2e",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#3e4949",
    textAlign: "center",
    maxWidth: 280,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  googleButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#bec9c9",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: "#1a1a2e",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#6e7979",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    textDecorationLine: "underline",
  },
});
