import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#00595c" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>1. Terms of Service</Text>
        <Text style={styles.paragraph}>
          Welcome to Karigar.ai. By accessing or using our platform, you agree to be bound by these terms. We provide an AI-powered service marketplace connecting you with skilled professionals.
        </Text>
        
        <Text style={styles.heading}>2. Privacy Policy</Text>
        <Text style={styles.paragraph}>
          Your privacy is important to us. We collect and use your data, including your location and usage information, to provide and improve our services. We do not sell your personal data to third parties.
        </Text>
        
        <Text style={styles.heading}>3. User Responsibilities</Text>
        <Text style={styles.paragraph}>
          You must maintain the confidentiality of your account and are responsible for all activities under your account. Please be respectful and follow our community guidelines when interacting with service providers.
        </Text>

        <Text style={styles.heading}>4. Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          In the event of a dispute with a service provider, Karigar.ai provides an automated dispute resolution system. By using the app, you agree to participate in this process in good faith.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e0fc',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    color: '#1a1a2e',
  },
  content: {
    padding: 24,
  },
  heading: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#00595c',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3e4949',
    lineHeight: 22,
    marginBottom: 16,
  },
});
