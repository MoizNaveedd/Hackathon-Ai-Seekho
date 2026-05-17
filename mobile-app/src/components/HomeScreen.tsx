import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Animated, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import ChatBottomSheet from './ChatBottomSheet';
import { transcribeVoiceLive } from '../services/transcriptionService';

export default function HomeScreen({ user, onSignOut }: { user: any, onSignOut: () => void }) {
  const userName = user?.user?.name || user?.data?.user?.name || user?.name || "Ali";
  const [activeTab, setActiveTab] = useState('home');
  const [locationName, setLocationName] = useState("Finding location...");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");
  const [pulseAnim] = useState(new Animated.Value(1));
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState('Upcoming');
  const [bookings, setBookings] = useState([
    {
      id: 'KG-9290',
      service: 'Electrical Wiring Check',
      provider: 'Assigning Provider...',
      providerDetail: 'Searching near your area',
      date: 'Oct 28, 2023',
      time: '09:00 AM - 11:00 AM',
      status: 'Active',
      color: '#FF8F00',
      badgeBg: '#fffde7',
      price: 'Rs 850 (Est)',
      rated: false,
    },
    {
      id: 'KG-9285',
      service: 'AC Deep Cleaning',
      provider: 'Salman Khan',
      providerDetail: 'HVAC Expert • 5.0★',
      date: 'Oct 26, 2023',
      time: '02:30 PM - 04:30 PM',
      status: 'Upcoming',
      color: '#00595c',
      badgeBg: '#e0f2f1',
      price: 'Rs 2,500',
      rated: false,
    },
    {
      id: 'KG-9281',
      service: 'General Plumbing Repair',
      provider: 'Ahmed Raza',
      providerDetail: 'Lead Plumber • 4.9★',
      date: 'Oct 24, 2023',
      time: '10:00 AM - 12:00 PM',
      status: 'Completed',
      color: '#005c3e',
      badgeBg: '#e8fff5',
      price: 'Rs 1,200',
      rated: false,
    }
  ]);

  const [ratingBooking, setRatingBooking] = useState<any>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    iconName?: string;
    iconColor?: string;
  } | null>(null);

  const isCancelledRef = useRef(false);
  const activeSessionRef = useRef(0);

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
    isCancelledRef.current = true;
    activeSessionRef.current++;
    setIsRecording(false);
    setIsTranscribing(false);
    // intentional 
    transcribeVoiceLive();
  }

  async function startSpeechRecognition() {
    const sessionId = ++activeSessionRef.current;
    isCancelledRef.current = false;
    setIsRecording(true);
    setIsTranscribing(true);

    try {
        if (sessionId !== activeSessionRef.current || isCancelledRef.current) return;

      const text = await transcribeVoiceLive();
      
      if (sessionId === activeSessionRef.current && !isCancelledRef.current && text && text.trim() !== '') {
        setSearchQuery(text);
      }
    } catch (err) {
      console.error('Failed speech recognition:', err);
    } finally {
      if (sessionId === activeSessionRef.current) {
        setIsRecording(false);
        setIsTranscribing(false);
      }
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

                <View style={[styles.voiceActionBtn, { opacity: 0.3 }]}>
                  <MaterialIcons name="check-circle" size={28} color="#005c3e" />
                  <Text style={[styles.voiceActionLabel, { color: '#005c3e' }]}>Done</Text>
                </View>
              </View>
            ) : isTranscribing ? (
              <View style={styles.transcribingWrapper}>
                <ActivityIndicator size="small" color="#00595c" />
                <Text style={styles.transcribingText}>Transcribing voice to text...</Text>
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
                    onPress={startSpeechRecognition}
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

        {/* Recommended Pro Card */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: '#1a1a2e', marginBottom: 12 }}>
            Recommended Specialist Near You
          </Text>
          <TouchableOpacity 
            style={[styles.aiCard, { backgroundColor: '#fff', borderColor: '#bec9c9', borderWidth: 1, marginBottom: 0 }]}
            onPress={() => router.push('/provider-profile')}
          >
            <View style={styles.aiCardLeft}>
              <Image 
                source={require('../../assets/images/ali_profile.png')}
                style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#00595c' }}
              />
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.aiCardTitle, { fontSize: 15, color: '#1a1a2e' }]}>Ali AC Services</Text>
                <Text style={[styles.aiCardSubtitle, { fontSize: 12, color: '#3e4949', marginTop: 2 }]} numberOfLines={1}>
                  ⭐ 4.8 · Inverter AC Expert · 2.4km
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#e8fff5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#005c3e' }}>Profile</Text>
              <MaterialIcons name="chevron-right" size={14} color="#005c3e" />
            </View>
          </TouchableOpacity>
        </View>

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
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={() => {
              setConfirmDialog({
                visible: true,
                title: "Log Out?",
                message: "Are you sure you want to log out of your Karigar.ai account?",
                confirmText: "Log Out",
                cancelText: "Cancel",
                iconName: "logout",
                iconColor: "#ba1a1a",
                onConfirm: () => {
                  setConfirmDialog(null);
                  onSignOut();
                }
              });
            }}
          >
            <MaterialIcons name="logout" size={24} color="#410006" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : activeTab === 'bookings' ? (
        <View style={styles.bookingsContainer}>
          {/* Header Bar */}
          <View style={styles.bookingsHeaderBar}>
            <Text style={styles.bookingsHeaderTitle}>My Bookings</Text>
            <View style={styles.bookingsCountBadge}>
              <Text style={styles.bookingsCountText}>
                {bookings.filter(b => b.status === selectedFilter).length}
              </Text>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterChipRow}>
            {['Upcoming', 'Active', 'Completed'].map((filterVal) => (
              <TouchableOpacity
                key={filterVal}
                style={[
                  styles.filterChipItem,
                  selectedFilter === filterVal && styles.activeFilterChipItem
                ]}
                onPress={() => setSelectedFilter(filterVal)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filterVal && styles.activeFilterChipText
                  ]}
                >
                  {filterVal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 20, paddingTop: 8 }]} 
            showsVerticalScrollIndicator={false}
          >
            {bookings
              .filter(b => b.status === selectedFilter)
              .map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  {/* Top Header Row of card */}
                  <View style={styles.bookingCardTop}>
                    <Text style={styles.bookingId}>{booking.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: booking.badgeBg }]}>
                      {booking.status === 'Active' && (
                        <ActivityIndicator size="small" color="#FF8F00" style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.statusBadgeText, { color: booking.color }]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>

                  {/* Service Title */}
                  <Text style={styles.bookingServiceTitle}>{booking.service}</Text>

                  {/* Divider line */}
                  <View style={styles.bookingCardDivider} />

                  {/* Provider Info Row */}
                  <View style={styles.bookingProviderRow}>
                    <View style={styles.providerAvatarPlaceholder}>
                      <MaterialIcons name="person" size={20} color="#3e4949" />
                    </View>
                    <View style={styles.providerMetaContainer}>
                      <Text style={styles.providerNameText}>{booking.provider}</Text>
                      <Text style={styles.providerDetailText}>{booking.providerDetail}</Text>
                    </View>
                  </View>

                  {/* Schedule details & cost row */}
                  <View style={styles.bookingScheduleRow}>
                    <View style={styles.scheduleDetailItem}>
                      <MaterialIcons name="event" size={16} color="#6e7979" />
                      <Text style={styles.scheduleDetailText}>{booking.date}</Text>
                    </View>
                    <View style={styles.scheduleDetailItem}>
                      <MaterialIcons name="access-time" size={16} color="#6e7979" />
                      <Text style={styles.scheduleDetailText}>{booking.time}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingCardDivider} />

                  {/* Cost & action buttons */}
                  <View style={styles.bookingCardBottom}>
                    <View style={styles.priceMeta}>
                      <Text style={styles.priceMetaLabel}>EST. COST</Text>
                      <Text style={styles.priceMetaVal}>{booking.price}</Text>
                    </View>
                    
                    <View style={styles.cardActionsRow}>
                      {booking.status === 'Upcoming' ? (
                        <>
                          <TouchableOpacity style={styles.actionBtnSec}>
                            <Text style={styles.actionBtnTextSec}>Invoice</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionBtnSec}
                            onPress={() => {
                              // Cancel booking confirmation dialog
                              setConfirmDialog({
                                visible: true,
                                title: "Cancel Booking?",
                                message: `Are you sure you want to cancel your ${booking.service} booking? This action is permanent and cannot be undone.`,
                                confirmText: "Yes, Cancel",
                                cancelText: "Keep Booking",
                                iconName: "warning",
                                iconColor: "#ba1a1a",
                                onConfirm: () => {
                                  setBookings(prev => prev.filter(b => b.id !== booking.id));
                                  setConfirmDialog(null);
                                }
                              });
                            }}
                          >
                            <Text style={styles.actionBtnTextSec}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionBtnPri}
                            onPress={() => {
                              // Reschedule confirmation dialog
                              setConfirmDialog({
                                visible: true,
                                title: "Reschedule Service?",
                                message: `Would you like to reschedule your ${booking.service} to another date & slot?`,
                                confirmText: "Reschedule",
                                cancelText: "Go Back",
                                iconName: "schedule",
                                iconColor: "#00595c",
                                onConfirm: () => {
                                  setConfirmDialog(null);
                                  router.push('/provider-profile'); // direct to reschedule dates slot modal!
                                }
                              });
                            }}
                          >
                            <Text style={styles.actionBtnTextPri}>Reschedule</Text>
                          </TouchableOpacity>
                        </>
                      ) : booking.status === 'Active' ? (
                        <>
                          <TouchableOpacity style={styles.actionBtnSec}>
                            <Text style={styles.actionBtnTextSec}>Track</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionBtnPri}
                            onPress={() => {
                              // Mark as Complete confirmation dialog
                              setConfirmDialog({
                                visible: true,
                                title: "Mark as Complete?",
                                message: `Has the technician finished your ${booking.service} to your complete satisfaction?`,
                                confirmText: "Yes, Complete",
                                cancelText: "Not Yet",
                                iconName: "check-circle",
                                iconColor: "#005c3e",
                                onConfirm: () => {
                                  setConfirmDialog(null);
                                  setRatingBooking(booking); // triggers rating overlay!
                                }
                              });
                            }}
                          >
                            <Text style={styles.actionBtnTextPri}>Mark as Complete</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity style={styles.actionBtnSec}>
                            <Text style={styles.actionBtnTextSec}>Invoice</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionBtnSec}
                            onPress={() => {
                              router.push('/provider-profile');
                            }}
                          >
                            <Text style={styles.actionBtnTextSec}>Book Again</Text>
                          </TouchableOpacity>
                          
                          {booking.rated ? (
                            <View style={[styles.actionBtnSec, { backgroundColor: '#fcf8ff', borderColor: '#00595c' }]}>
                              <Text style={[styles.actionBtnTextSec, { color: '#00595c', fontWeight: 'bold' }]}>★ Rated</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.actionBtnPri}
                              onPress={() => {
                                // Open Rate Service directly!
                                setRatingBooking(booking);
                              }}
                            >
                              <Text style={styles.actionBtnTextPri}>Rate</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}

            {bookings.filter(b => b.status === selectedFilter).length === 0 && (
              <View style={styles.emptyBookingsContainer}>
                <MaterialIcons name="event-busy" size={48} color="#bec9c9" />
                <Text style={styles.emptyBookingsTitle}>No Bookings Found</Text>
                <Text style={styles.emptyBookingsSubtitle}>
                  You don't have any {selectedFilter.toLowerCase()} bookings.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
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
      onClose={() => {
        setChatVisible(false);
        setChatInitialQuery("");
      }}
      userName={userName}
    />

    {ratingBooking && (
      <Modal
        visible={!!ratingBooking}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => setRatingBooking(null)}
      >
        <SafeAreaView style={styles.ratingModalContainer}>
          {/* Header bar */}
          <View style={styles.ratingModalHeader}>
            <TouchableOpacity onPress={() => setRatingBooking(null)} style={styles.ratingCloseBtn}>
              <MaterialIcons name="close" size={24} color="#1a1a2e" />
            </TouchableOpacity>
            <Text style={styles.ratingHeaderTitle}>Rate Service</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.ratingScrollContent} showsVerticalScrollIndicator={false}>
            {/* Expert Profile Header */}
            <View style={styles.ratingExpertCard}>
              <View style={styles.ratingExpertAvatar}>
                <MaterialIcons name="person" size={48} color="#fff" />
              </View>
              <Text style={styles.ratingExpertName}>
                {ratingBooking.provider === 'Assigning Provider...' ? 'Ahmed Hassan' : ratingBooking.provider}
              </Text>
              <Text style={styles.ratingExpertSubtitle}>
                {ratingBooking.provider === 'Assigning Provider...' ? 'Expert AC Technician • Service ID #4829' : (ratingBooking.providerDetail || 'Expert Specialist')}
              </Text>
            </View>

            {/* How was your experience question */}
            <View style={styles.ratingQuestionCard}>
              <Text style={styles.ratingQuestionTitle}>How was your experience?</Text>
              
              {/* Large Interactive Star Row */}
              <View style={styles.ratingStarRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setRatingStars(star)}
                    style={{ marginHorizontal: 8 }}
                  >
                    <MaterialIcons 
                      name={star <= ratingStars ? "star" : "star-border"} 
                      size={48} 
                      color={star <= ratingStars ? "#FFB300" : "#bec9c9"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic Rating Score Text */}
              <Text style={styles.ratingScoreLabel}>
                {ratingStars === 5 ? "Excellent!" : 
                 ratingStars === 4 ? "Very Good!" : 
                 ratingStars === 3 ? "Good" : 
                 ratingStars === 2 ? "Fair" : "Poor"}
              </Text>
            </View>

            {/* KARIGAR INSIGHT AI card */}
            <View style={styles.ratingInsightCard}>
              <View style={styles.ratingInsightHeader}>
                <MaterialIcons name="auto-awesome" size={20} color="#005c3e" style={{ marginRight: 6 }} />
                <Text style={styles.ratingInsightTitle}>KARIGAR INSIGHT</Text>
              </View>
              <Text style={styles.ratingInsightText}>
                Your positive feedback helps {ratingBooking.provider === 'Assigning Provider...' ? 'Ahmed' : ratingBooking.provider.split(' ')[0]} rank higher for {ratingBooking.service.toLowerCase().includes('ac') ? 'AC maintenance' : 'home services'} in Lahore. Great choice!
              </Text>
            </View>

            {/* Order breakdown card */}
            <View style={styles.ratingOrderCard}>
              <View style={styles.ratingOrderRow}>
                <Text style={styles.ratingOrderLabel}>Order ID</Text>
                <Text style={styles.ratingOrderVal}>{ratingBooking.id}</Text>
              </View>
              <View style={styles.ratingOrderRow}>
                <Text style={styles.ratingOrderLabel}>Service</Text>
                <Text style={styles.ratingOrderVal}>{ratingBooking.service}</Text>
              </View>
              <View style={styles.ratingOrderRow}>
                <Text style={styles.ratingOrderLabel}>Price Paid</Text>
                <Text style={[styles.ratingOrderVal, { color: '#00595c', fontWeight: 'bold' }]}>
                  {ratingBooking.price.includes('Est') ? ratingBooking.price.replace('(Est)', '').trim() : ratingBooking.price}
                </Text>
              </View>
            </View>

            {/* Review input card */}
            <View style={styles.ratingInputCard}>
              <Text style={styles.ratingInputLabel}>Write a review (Optional)</Text>
              <TextInput
                style={styles.ratingTextInput}
                placeholder="Share details of your experience to help others..."
                placeholderTextColor="#bec9c9"
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          {/* Bottom Actions button */}
          <View style={styles.ratingFooter}>
            <TouchableOpacity 
              style={styles.ratingSubmitBtn}
              onPress={() => {
                // Submit Feedback simulation:
                // 1. Shift target booking to Completed state and set rated to true!
                setBookings(prev => prev.map(b => 
                  b.id === ratingBooking.id 
                    ? { 
                        ...b, 
                        status: 'Completed', 
                        rated: true, 
                        provider: b.provider === 'Assigning Provider...' ? 'Ahmed Hassan' : b.provider,
                        providerDetail: b.provider === 'Assigning Provider...' ? 'Expert AC Technician • Service ID #4829' : b.providerDetail,
                        color: '#005c3e', 
                        badgeBg: '#e8fff5' 
                      } 
                    : b
                ));
                
                // 2. Transition tab selections
                setSelectedFilter('Completed');
                setActiveTab('bookings');
                
                // 3. Clear ratings states
                setRatingBooking(null);
                setRatingStars(5);
                setRatingComment("");
              }}
            >
              <Text style={styles.ratingSubmitText}>Submit Feedback</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    )}

    {confirmDialog && (
      <Modal
        visible={confirmDialog.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmDialog(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            {/* Top Icon wrapper */}
            {confirmDialog.iconName && (
              <View style={[styles.confirmIconContainer, { backgroundColor: confirmDialog.iconColor + '15' }]}>
                <MaterialIcons name={confirmDialog.iconName as any} size={32} color={confirmDialog.iconColor} />
              </View>
            )}

            {/* Title & Body */}
            <Text style={styles.confirmTitle}>{confirmDialog.title}</Text>
            <Text style={styles.confirmMessage}>{confirmDialog.message}</Text>

            {/* Actions Row */}
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setConfirmDialog(null)}
              >
                <Text style={styles.confirmCancelText}>{confirmDialog.cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmBtn, 
                  { backgroundColor: confirmDialog.iconColor || '#00595c' }
                ]} 
                onPress={confirmDialog.onConfirm}
              >
                <Text style={styles.confirmBtnText}>{confirmDialog.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )}
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
  transcribingWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 40,
  },
  transcribingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#00595c',
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
  },
  // --- MY BOOKINGS STYLE SPECIFICATIONS ---
  bookingsContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  bookingsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
    gap: 12,
  },
  bookingsHeaderTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    color: '#1a1a2e',
  },
  bookingsCountBadge: {
    backgroundColor: '#e8fff5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b3e8d8',
  },
  bookingsCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#005c3e',
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
    gap: 8,
  },
  filterChipItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    backgroundColor: '#FAFAFA',
  },
  activeFilterChipItem: {
    backgroundColor: '#00595c',
    borderColor: '#00595c',
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3e4949',
  },
  activeFilterChipText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingId: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#6e7979',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  bookingServiceTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 12,
  },
  bookingCardDivider: {
    height: 1,
    backgroundColor: '#bec9c9',
    marginVertical: 12,
    opacity: 0.5,
  },
  bookingProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  providerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  providerMetaContainer: {
    flexDirection: 'column',
  },
  providerNameText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  providerDetailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
    marginTop: 2,
  },
  bookingScheduleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scheduleDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleDetailText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3e4949',
  },
  bookingCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceMeta: {
    flexDirection: 'column',
  },
  priceMetaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#6e7979',
  },
  priceMetaVal: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#00595c',
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnSec: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  actionBtnTextSec: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#3e4949',
  },
  actionBtnPri: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00595c',
  },
  actionBtnTextPri: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  emptyBookingsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyBookingsTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
  },
  emptyBookingsSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6e7979',
    textAlign: 'center',
  },
  ratingModalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  ratingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f2',
    backgroundColor: '#fff',
  },
  ratingCloseBtn: {
    padding: 4,
  },
  ratingHeaderTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#1a1a2e',
  },
  ratingScrollContent: {
    padding: 20,
    gap: 20,
  },
  ratingExpertCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#bec9c9',
    shadowColor: '#00595c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingExpertAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ratingExpertName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#1a1a2e',
  },
  ratingExpertSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6e7979',
    marginTop: 4,
  },
  ratingQuestionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  ratingQuestionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 16,
  },
  ratingStarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingScoreLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#FFB300',
  },
  ratingInsightCard: {
    backgroundColor: '#e8fff5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#005c3e',
  },
  ratingInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingInsightTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#005c3e',
  },
  ratingInsightText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#00331e',
    lineHeight: 18,
  },
  ratingOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    gap: 12,
  },
  ratingOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingOrderLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6e7979',
  },
  ratingOrderVal: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  ratingInputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    gap: 8,
  },
  ratingInputLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  ratingTextInput: {
    borderWidth: 1,
    borderColor: '#bec9c9',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1a1a2e',
    height: 80,
    textAlignVertical: 'top',
  },
  ratingFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f2',
  },
  ratingSubmitBtn: {
    backgroundColor: '#00595c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSubmitText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eef2f2',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6e7979',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bec9c9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#3e4949',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#fff',
  }
});
