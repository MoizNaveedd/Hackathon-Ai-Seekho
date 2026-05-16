import { useEffect, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert, Image, Dimensions } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { MaterialIcons } from "@expo/vector-icons";
import HomeScreen from "../components/HomeScreen";

const { width } = Dimensions.get("window");

export default function Index() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "795466151653-hieiocfpjk4uvfms1omvfm855n5v30bm.apps.googleusercontent.com",
    });
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const user = await GoogleSignin.signIn();
      console.log("✨ Google Sign-In Success! User Data:", JSON.stringify(user, null, 2));
      setUserInfo(user);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled the login flow");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Hold on", "Sign in is already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services are not available or outdated.");
      } else {
        Alert.alert("Sign In Failed", error.message || "An unknown error occurred during sign in.");
        console.error("Sign in error:", error);
      }
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUserInfo(null);
    } catch (error: any) {
      Alert.alert("Sign Out Failed", error.message || "Could not sign out completely.");
      console.error("Sign out error:", error);
    }
  };

  if (userInfo) {
    return <HomeScreen user={userInfo} onSignOut={signOut} />;
  }

  return (
    <View style={styles.container}>
      {/* Top 40%: Branding Canvas */}
      <View style={styles.heroSection}>
        {/* Decorative Teal Circle */}
        <View style={styles.decorativeCircle} />
        {/* Massive Primary Circle */}
        <View style={styles.primaryCircle}>
          <View style={styles.dashedRing} />
        </View>

        {/* Identity Anchor */}
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
        <TouchableOpacity style={styles.googleButton} onPress={signIn} activeOpacity={0.8}>
          <Image 
            source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
            style={styles.googleIcon}
            resizeMode="contain"
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>




      </View>

      {/* Footer Terms */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to Karigar.ai's{"\n"}
          <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  phoneButton: {
    width: "100%",
    height: 56,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#00595c",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  phoneButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#00595c",
    marginLeft: 8,
  },
  loginHint: {
    alignItems: "center",
    marginTop: 8,
  },
  hintText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#3e4949",
  },
  loginLink: {
    color: "#00595c",
    fontWeight: "bold",
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
