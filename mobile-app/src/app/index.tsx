import { useEffect, useState } from "react";
import { Text, View, StyleSheet, Button, Alert } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

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
        // No need to alert the user if they intentionally cancelled
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

  return (
    <View style={styles.container}>
      {userInfo ? (
        <>
          <Text style={styles.text}>
            Welcome, {userInfo?.user?.name || userInfo?.data?.user?.name || userInfo?.name || "User"}
          </Text>
          <Button title="Sign Out" onPress={signOut} />
        </>
      ) : (
        <>
          <Text style={styles.title}>Welcome to the App!</Text>
          <Button title="Google Sign-In" onPress={signIn} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  }
});
