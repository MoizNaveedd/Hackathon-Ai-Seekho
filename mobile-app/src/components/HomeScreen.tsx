import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import ChatBottomSheet from './ChatBottomSheet';

export default function HomeScreen({ user, onSignOut }: { user: any, onSignOut: () => void }) {
  const userName = user?.user?.name || user?.data?.user?.name || user?.name || "Ali";
  const [activeTab, setActiveTab] = useState('home');
  const [locationName, setLocationName] = useState("Finding location...");
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");
  const [chatInitialAudioUri, setChatInitialAudioUri] = useState("");
  const [pulseAnim] = useState(new Animated.Value(1));
  const router = useRouter();

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  async function cancelRecording() {
    setIsRecording(false);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setRecording(undefined);
    } catch (err) {
      console.error('Failed to cancel recording', err);
    }
  }

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (!recording) return;

    try {
      const uri = recording.getURI();
      await recording.stopAndUnloadAsync();
      setRecording(undefined);
      
      if (uri) {
        setChatInitialAudioUri(uri);
        setChatInitialQuery("");
        setChatVisible(true);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName("Location denied");
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const { city, district, region, subregion } = reverseGeocode[0];
          const area = district || subregion || city || 'Unknown Area';
          const reg = region ? `, ${region}` : '';
          setLocationName(`${area}${reg}`);
        } else {
          setLocationName("Location found");
        }
      } catch (error) {
        setLocationName("Location error");
      }
    })();
  }, []);
  
  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Anchor */}
      {activeTab === 'home' && (
        <View style={styles.navBar}>
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={24} color="#00595c" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
              <Text style={styles.locationValue} numberOfLines={1}>{locationName}</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="notifications" size={24} color="#3e4949" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileAvatar} onPress={() => setActiveTab('profile')}>
              <Image 
                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_MXCjwGeq0GUiyK3WW6t6yqZ7TxAls0iXWQo8vCl7kmNU4HlRa0WceleGvbd1HJOROkvw5ow3lgtyXVGfS75uzsj4d-AyEoRN4SJLRiPDktmx2t1xPDrYq_q539mk4c9cYjpY4ljvJ5U03Ge1HUsRfQ6a0L3KmtJtJPCVDURdK4qJ9naUuM7h5YWxkAmGOTqN2nlM-qWh-x2H-_QR-9Dk_JBlTSSw3hUmA7D072attkBMp282axpaR5KyYW0DTyXZVsYO9JAkpmc" }} 
                style={styles.avatarImage} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {activeTab === 'profile' && (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => setActiveTab('home')} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#00595c" />
          </TouchableOpacity>
          <Text style={styles.profileNavTitle}>Karigar.ai</Text>
          <TouchableOpacity style={{ padding: 8 }}>
            <MaterialIcons name="more-vert" size={24} color="#00595c" />
          </TouchableOpacity>
        </View>
      )}
      {activeTab === 'home' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Hello, {userName}</Text>
          <Text style={styles.greetingSubtitle}>What can we help you fix today?</Text>
        </View>

        {/* Smart Request Section */}
        <View style={styles.searchSection}>
          <View style={[styles.searchInputContainer, isRecording && styles.recordingContainer]}>
            {isRecording ? (
              <View style={styles.recordingActiveWrapper}>
                <TouchableOpacity onPress={cancelRecording} style={styles.voiceActionBtn}>
                  <MaterialIcons name="close" size={24} color="#ba1a1a" />
                  <Text style={styles.voiceActionLabel}>Cancel</Text>
                </TouchableOpacity>
                
                <View style={styles.voicePulseContainer}>
                  <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialIcons name="mic" size={36} color="#00595c" />
                  </Animated.View>
                  <Text style={styles.listeningText}>Listening...</Text>
                </View>

                <TouchableOpacity onPress={stopRecording} style={styles.voiceActionBtn}>
                  <MaterialIcons name="check-circle" size={28} color="#005c3e" />
                  <Text style={[styles.voiceActionLabel, { color: '#005c3e' }]}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={24} color="#00595c" style={styles.searchIconLeft} />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="AC kaam nahi kar raha..."
                  placeholderTextColor="#6e7979"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  multiline={true}
                  numberOfLines={10}
                />
                {searchQuery.trim().length > 0 ? (
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={() => {
                      const q = searchQuery.trim();
                      setChatInitialQuery(q);
                      setChatVisible(true);
                      setSearchQuery("");
                    }}
                  >
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.searchIconRight}
                    onPress={startRecording}
                  >
                    <MaterialIcons name="mic" size={24} color="#00595c" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity style={styles.suggestionBadge}><Text style={styles.suggestionText}>AC not cooling</Text></TouchableOpacity>
            <TouchableOpacity style={styles.suggestionBadge}><Text style={styles.suggestionText}>Plumber needed</Text></TouchableOpacity>
            <TouchableOpacity style={styles.suggestionBadge}><Text style={styles.suggestionText}>Fan making noise</Text></TouchableOpacity>
          </View>
        </View>

        {/* AI Smart Match Card */}
        <TouchableOpacity style={styles.aiCard}>
          <View style={styles.aiCardLeft}>
            <View style={styles.aiIconBox}>
              <MaterialIcons name="verified-user" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.aiCardTitle}>Smart Assurance</Text>
              <Text style={styles.aiCardSubtitle}>Verified professionals at your doorstep.</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#00595c" />
        </TouchableOpacity>

        {/* Popular Services Grid */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <Text style={styles.popularTitle}>Popular Services</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>VIEW ALL</Text></TouchableOpacity>
          </View>
          
          <View style={styles.gridContainer}>
            {[
              { name: 'AC Service', icon: 'ac-unit' },
              { name: 'Plumbing', icon: 'plumbing' },
              { name: 'Electrical', icon: 'electrical-services' },
              { name: 'Cleaning', icon: 'cleaning-services' },
              { name: 'Painting', icon: 'format-paint' },
              { name: 'Carpentry', icon: 'carpenter' },
              { name: 'Pest Control', icon: 'pest-control' },
              { name: 'Appliances', icon: 'kitchen' },
            ].map((service, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.gridItem}
                onPress={() => {
                  setChatInitialQuery(`I want ${service.name}`);
                  setChatVisible(true);
                }}
              >
                <View style={styles.gridIconBox}>
                  <MaterialIcons name={service.icon as any} size={32} color="#00595c" />
                </View>
                <Text style={styles.gridItemText}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <Image 
            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxn-ETJ6ap8Y5aCGIpVxin02ibsfixike5E-t6F81lsIi_3usgIx_kYtIyqIuL8Lk6Pj_liOrn93QtHIQeg76pK1DdWORaA48LXo4QfJoqxd3bP3plAHn0OnLT7PAu5SngaZ7HJucHf2CnuHhRgki90IcQItz4vppqtqRXiI0okaCwiZqYUOnJI2wZ3Ub6Y6t83kk8NCIYWV596ZQPxK9UE9WVPlVRpxfPrBFovuc46H8qNZoeT1hVSRk9sczwkJIgiRcKAjcMaas" }}
            style={styles.promoImage}
          />
          <View style={styles.promoOverlay}>
            <Text style={styles.promoLabel}>SUMMER OFFER</Text>
            <Text style={styles.promoTitle}>20% OFF on AC Services</Text>
            <TouchableOpacity style={styles.promoButton}>
              <Text style={styles.promoButtonText}>BOOK NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      ) : activeTab === 'profile' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainerLarge}>
              <Image 
                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_MXCjwGeq0GUiyK3WW6t6yqZ7TxAls0iXWQo8vCl7kmNU4HlRa0WceleGvbd1HJOROkvw5ow3lgtyXVGfS75uzsj4d-AyEoRN4SJLRiPDktmx2t1xPDrYq_q539mk4c9cYjpY4ljvJ5U03Ge1HUsRfQ6a0L3KmtJtJPCVDURdK4qJ9naUuM7h5YWxkAmGOTqN2nlM-qWh-x2H-_QR-9Dk_JBlTSSw3hUmA7D072attkBMp282axpaR5KyYW0DTyXZVsYO9JAkpmc" }} 
                style={styles.avatarImageLarge} 
              />
              <TouchableOpacity style={styles.editAvatarBtn}>
                <MaterialIcons name="edit" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileMember}>Premium Member</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>BOOKINGS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>4.9</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="star" size={14} color="#005c3e" />
                <Text style={[styles.statLabel, { marginLeft: 4 }]}>RATING</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>Rs 600</Text>
              <Text style={styles.statLabel}>WALLET</Text>
            </View>
          </View>

          {/* Menu Sections */}
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>ACCOUNT</Text>
            <View style={styles.menuCard}>
              {[
                { icon: 'person-outline', label: 'Edit Profile' },
                { icon: 'location-on', label: 'Addresses' },
                { icon: 'payments', label: 'Payment' },
                { icon: 'account-balance-wallet', label: 'Wallet', trailing: 'Rs 600' },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={[styles.menuItem, i !== 3 && styles.menuItemBorder]}>
                  <View style={styles.menuItemLeft}>
                    <MaterialIcons name={item.icon as any} size={24} color="#3e4949" />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.trailing && <Text style={styles.menuItemTrailing}>{item.trailing}</Text>}
                    <MaterialIcons name="chevron-right" size={24} color="#6e7979" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>PREFERENCES</Text>
            <View style={styles.menuCard}>
              {[
                { icon: 'translate', label: 'Language', trailing: 'English' },
                { icon: 'notifications-active', label: 'Notifications' },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={[styles.menuItem, i !== 1 && styles.menuItemBorder]}>
                  <View style={styles.menuItemLeft}>
                    <MaterialIcons name={item.icon as any} size={24} color="#3e4949" />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.trailing && <Text style={styles.menuItemTrailing}>{item.trailing}</Text>}
                    <MaterialIcons name="chevron-right" size={24} color="#6e7979" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>SUPPORT</Text>
            <View style={styles.menuCard}>
              {[
                { icon: 'help-outline', label: 'Help Center' },
                { icon: 'gavel', label: 'Terms & Privacy', onPress: () => router.push('/terms') },
              ].map((item, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.menuItem, i !== 1 && styles.menuItemBorder]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <MaterialIcons name={item.icon as any} size={24} color="#3e4949" />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#6e7979" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={onSignOut}>
            <MaterialIcons name="logout" size={24} color="#410006" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.comingSoonContainer}>
          <MaterialIcons name="construction" size={64} color="#00595c" />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonSubtitle}>We're working hard on this feature.</Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Bottom Navigation Shell */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <MaterialIcons name="home" size={24} color={activeTab === 'home' ? '#00595c' : '#3e4949'} />
          <Text style={[styles.navText, activeTab === 'home' && { color: '#00595c' }]}>Home</Text>
          {activeTab === 'home' && <View style={styles.navActiveIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('bookings')}>
          <MaterialIcons name="event-note" size={24} color={activeTab === 'bookings' ? '#00595c' : '#3e4949'} />
          <Text style={[styles.navText, activeTab === 'bookings' && { color: '#00595c' }]}>My Bookings</Text>
          {activeTab === 'bookings' && <View style={styles.navActiveIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('notifications')}>
          <MaterialIcons name="notifications" size={24} color={activeTab === 'notifications' ? '#00595c' : '#3e4949'} />
          <Text style={[styles.navText, activeTab === 'notifications' && { color: '#00595c' }]}>Notifications</Text>
          {activeTab === 'notifications' && <View style={styles.navActiveIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <MaterialIcons name="person" size={24} color={activeTab === 'profile' ? '#00595c' : '#3e4949'} />
          <Text style={[styles.navText, activeTab === 'profile' && { color: '#00595c' }]}>Profile</Text>
          {activeTab === 'profile' && <View style={styles.navActiveIndicator} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>

    <ChatBottomSheet
      visible={chatVisible}
      initialQuery={chatInitialQuery}
      initialAudioUri={chatInitialAudioUri}
      onClose={() => {
        setChatVisible(false);
        setChatInitialAudioUri("");
        setChatInitialQuery("");
      }}
      userName={userName}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: '#fcf8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTextContainer: {
    flexDirection: 'column',
  },
  locationLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
    color: '#3e4949',
  },
  locationValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#1a1a2e',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00595c',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 100, // For FAB and Bottom Nav
  },
  greetingSection: {
    marginBottom: 24,
  },
  greetingTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: '#1a1a2e',
  },
  greetingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3e4949',
    marginTop: 4,
  },
  searchSection: {
    marginBottom: 32,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 56,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bec9c9',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIconLeft: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1a1a2e',
    textAlignVertical: 'center',
  },
  searchIconRight: {
    padding: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    borderColor: '#00595c',
    backgroundColor: '#f0fdfa',
    borderWidth: 2,
    height: 150,
  },
  recordingActiveWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  voiceActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  voiceActionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#ba1a1a',
    marginTop: 4,
  },
  voicePulseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 89, 92, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#00595c',
    marginTop: 8,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  suggestionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#efecff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  suggestionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#3e4949',
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8fff5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,89,92,0.1)',
  },
  aiCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#00595c',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#00595c',
  },
  aiCardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3e4949',
  },
  popularSection: {
    marginBottom: 32,
  },
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  popularTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    color: '#1a1a2e',
  },
  viewAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#00595c',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  micActive: {
    backgroundColor: '#ffdad6',
    borderRadius: 20,
    transform: [{ scale: 1.1 }],
  },
  gridIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#f5f2ff',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridItemText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
  },
  promoBanner: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 32,
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
  promoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,89,92,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  promoLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  promoTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: '#fff',
    maxWidth: 200,
    marginBottom: 12,
  },
  promoButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#00595c',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#fcf8ff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#bec9c9',
    paddingBottom: 20,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#3e4949',
    marginTop: 4,
  },
  navActiveIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00595c',
    marginTop: 4,
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    color: '#1a1a2e',
    marginTop: 16,
  },
  comingSoonSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3e4949',
    marginTop: 8,
  },
  profileNavTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#1a1a2e',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainerLarge: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImageLarge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00595c',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  profileName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  profileMember: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#3e4949',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#00595c',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#3e4949',
    letterSpacing: 0.5,
  },
  menuGroup: {
    marginBottom: 24,
  },
  menuGroupTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#6e7979',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e0fc',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1a1a2e',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemTrailing: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#005c3e',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdad8',
    padding: 16,
    borderRadius: 12,
    gap: 16,
    marginTop: 8,
  },
  logoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#410006',
  }
});
