import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Animated, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, BackHandler, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import MapView, { Marker, Polyline } from 'react-native-maps';
import ChatBottomSheet, { Message } from './ChatBottomSheet';
import { transcribeVoiceLive } from '../services/transcriptionService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getUserBookings, cancelBooking, completeBooking, getProviders, Provider } from '../services/apiService';
import { scheduleHeadsUpNotification } from '../services/notificationService';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '[GCP_API_KEY]';

export default function HomeScreen({ user, onSignOut }: { user: any, onSignOut: () => void }) {
  // `user` is now the full `AuthUser` context
  const userId = user?.backendUser?.user?.id || null;
  const userName = user?.backendUser?.user?.name || user?.googleData?.user?.name || "Ali";
  const userPhoto = user?.backendUser?.user?.photo || user?.googleData?.user?.photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuA_MXCjwGeq0GUiyK3WW6t6yqZ7TxAls0iXWQo8vCl7kmNU4HlRa0WceleGvbd1HJOROkvw5ow3lgtyXVGfS75uzsj4d-AyEoRN4SJLRiPDktmx2t1xPDrYq_q539mk4c9cYjpY4ljvJ5U03Ge1HUsRfQ6a0L3KmtJtJPCVDURdK4qJ9naUuM7h5YWxkAmGOTqN2nlM-qWh-x2H-_QR-9Dk_JBlTSSw3hUmA7D072attkBMp282axpaR5KyYW0DTyXZVsYO9JAkpmc";
  const [activeTab, setActiveTab] = useState('home');
  const [locationName, setLocationName] = useState("Finding location...");
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");
  const [chatProviderMode, setChatProviderMode] = useState(false);
  const [chatProviderName, setChatProviderName] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<Message[]>([]);
  const [providerMessages, setProviderMessages] = useState<Message[]>([]);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<any>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Booking Confirmed",
      description: "Your technician, Ali Khan, has confirmed the appointment for tomorrow at 10:00 AM.",
      time: "5 hours ago",
      icon: "check-circle",
      iconColor: "#005c3e",
      bgColor: "rgba(0, 92, 62, 0.08)",
      unread: false,
    },
    {
      id: 2,
      title: "Service Provider Arrived",
      description: "Ali Khan has arrived at your location. Please guide him to the workspace.",
      time: "1 hour ago",
      icon: "room",
      iconColor: "#00595c",
      bgColor: "rgba(0, 89, 92, 0.08)",
      unread: true,
    },
    {
      id: 3,
      title: "Service Completed",
      description: "The AC Repair service has been marked completed by Ali Khan. Please review the invoice and rate the service.",
      time: "10 mins ago",
      icon: "verified",
      iconColor: "#00595c",
      bgColor: "rgba(0, 89, 92, 0.08)",
      unread: true,
    }
  ]);

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, unread: false } : item));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(item => ({ ...item, unread: false })));
  };

  const getInvoiceDetails = (priceStr: string) => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, '')) || 1200;
    return {
      baseFee: `Rs ${num.toLocaleString()}`,
      distanceFee: "Rs 200",
      urgencyFee: "Rs 300",
      discount: "-Rs 150",
      walletCredit: `-Rs 350`,
      totalPaid: `Rs ${num.toLocaleString()}`
    };
  };

  const downloadInvoicePdf = async (booking: any) => {
    if (!booking) return;
    const details = getInvoiceDetails(booking.price);
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 24px;
              color: #1a1a2e;
              background-color: #FAFAFA;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #00595c;
              padding-bottom: 16px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #00595c;
              margin-bottom: 4px;
            }
            .tagline {
              font-size: 12px;
              color: #6e7979;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .status-container {
              margin-top: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .status {
              color: #005c3e;
              background-color: rgba(0, 92, 62, 0.1);
              display: inline-block;
              padding: 6px 16px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .invoice-id {
              font-size: 16px;
              font-weight: bold;
              color: #3e4949;
            }
            .invoice-date {
              font-size: 12px;
              color: #6e7979;
            }
            .card {
              background-color: #fff;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid #bec9c9;
            }
            .card-title {
              font-size: 12px;
              font-weight: bold;
              color: #6e7979;
              letter-spacing: 1px;
              margin-bottom: 16px;
              text-transform: uppercase;
              border-bottom: 1px dashed #bec9c9;
              padding-bottom: 8px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              font-size: 14px;
              color: #3e4949;
            }
            .row strong {
              color: #1a1a2e;
            }
            .total-row {
              border-top: 1px solid #bec9c9;
              padding-top: 12px;
              margin-top: 12px;
              font-weight: bold;
              font-size: 18px;
              color: #1a1a2e;
            }
            .success-text {
              color: #005c3e;
              font-weight: 600;
            }
            .footer-info {
              text-align: center;
              font-size: 11px;
              color: #6e7979;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Karigar.ai</div>
            <div class="tagline">Your Trusted Service Assistant</div>
            <div class="status-container">
              <span class="status">PAID</span>
              <span class="invoice-id">Invoice #INV-88291</span>
              <span class="invoice-date">Date: ${booking.date}</span>
            </div>
          </div>
          
          <div class="card">
            <div class="card-title">Service Details</div>
            <div class="row">
              <strong>Service Rendered</strong>
              <span>${booking.service}</span>
            </div>
            <div class="row">
              <strong>Service Provider</strong>
              <span>${booking.provider}</span>
            </div>
            <div class="row">
              <strong>Date & Time</strong>
              <span>${booking.date} | ${booking.time.split(" - ")[0]}</span>
            </div>
          </div>
          
          <div class="card">
            <div class="card-title">Billing Breakdown</div>
            <div class="row">
              <span>Base Service Fee</span>
              <span>${details.baseFee}</span>
            </div>
            <div class="row">
              <span>Distance Fee</span>
              <span>${details.distanceFee}</span>
            </div>
            <div class="row">
              <span>Urgency Fee</span>
              <span>${details.urgencyFee}</span>
            </div>
            <div class="row success-text">
              <span>Discount (Promo)</span>
              <span>${details.discount}</span>
            </div>
            <div class="row success-text">
              <span>Wallet Credit Used</span>
              <span>${details.walletCredit}</span>
            </div>
            <div class="row total-row">
              <span>Total Amount Paid</span>
              <span>${details.totalPaid}</span>
            </div>
          </div>
          
          <div class="card">
            <div class="card-title">Payment Information</div>
            <div class="row">
              <strong>Payment Method</strong>
              <span style="font-weight: bold; color: #005c3e;">Cash</span>
            </div>
            <div class="row">
              <strong>Payment Status</strong>
              <span class="success-text">Settled</span>
            </div>
          </div>

          <div class="footer-info">
            Thank you for choosing Karigar.ai! This is a system-generated invoice.
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Download Invoice - ${booking.id}`,
        UTI: 'com.adobe.pdf'
      });
    } catch (error: any) {
      alert("Failed to download PDF invoice: " + error.message);
    }
  };

  const requestLocation = async () => {
    setLocationName("Finding location...");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName("Location denied");
        setLocationModalVisible(true);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const { city, district, region, subregion } = reverseGeocode[0];
        const area = district || subregion || city || 'Unknown Area';
        setLocationName(area);
      } else {
        setLocationName("Location found");
      }
    } catch (error) {
      setLocationName("Location error");
    }
  };

  const fetchProvidersData = async (lat?: number, lng?: number) => {
    setIsLoadingProviders(true);
    try {
      const res = await getProviders({
        latitude: lat,
        longitude: lng,
        limit: 10
      });
      if (res && res.providers) {
        const validProviders = res.providers.filter(p => p.latitude !== null && p.longitude !== null && p.latitude !== undefined && p.longitude !== undefined);
        setProviders(validProviders);
      }
    } catch (error) {
      console.error("Failed to fetch providers in HomeScreen:", error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (userLocation) {
      fetchProvidersData(userLocation.latitude, userLocation.longitude);
    } else {
      fetchProvidersData();
    }
  }, [userLocation]);


  const [pulseAnim] = useState(new Animated.Value(1));
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);

  const [apiBookings, setApiBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const fetchBookings = async () => {
    if (!userId) return;
    setIsLoadingBookings(true);
    try {
      const response = await getUserBookings(userId);
      if (response && response.bookings) {
        setApiBookings(response.bookings);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, userId]);

  const mapApiBooking = (item: any) => {
    let appStatus = 'Upcoming';
    let badgeBg = '#e0f2f1';
    let color = '#00595c';
    
    if (item.status === 'Completed') {
      appStatus = 'Completed';
      badgeBg = '#e8fff5';
      color = '#005c3e';
    } else if (item.status === 'Active' || item.status === 'In Progress' || item.status === 'In_Progress') {
      appStatus = 'Active';
      badgeBg = '#fffde7';
      color = '#FF8F00';
    } else {
      // Confirmed, Pending, or any other raw state defaults to 'Upcoming'
      appStatus = 'Upcoming';
      if (item.status === 'Cancelled' || item.status === 'Declined') {
        badgeBg = '#ffebee';
        color = '#c62828';
      } else {
        badgeBg = '#e0f2f1';
        color = '#00595c';
      }
    }

    let formattedDate = item.booking_date;
    try {
      const d = new Date(item.booking_date);
      if (!isNaN(d.getTime())) {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        formattedDate = d.toLocaleDateString('en-US', options);
      }
    } catch (e) {}

    return {
      id: `BK-${item.id}`,
      realId: item.id,
      service: item.service_type || item.user_intent || 'Selected Service',
      provider: item.provider?.name || 'Assigned Provider',
      providerDetail: `${item.provider?.service_type || 'Specialist'} • ${item.provider?.rating || '4.5'}★`,
      date: formattedDate,
      time: item.time_slot || 'Flexible Slot',
      status: appStatus,
      color,
      badgeBg,
      price: `Rs. ${item.price}`,
      rated: item.customer_rating !== null,
      rawItem: item
    };
  };

  const getDisplayedBookings = () => {
    return apiBookings
      .map(mapApiBooking)
      .filter(b => b.status === selectedFilter);
  };

  const [ratingBooking, setRatingBooking] = useState<any>(null);
  const [trackingBooking, setTrackingBooking] = useState<any>(null);
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
    const handleBackPress = () => {
      if (chatVisible) {
        return true; // handled, don't allow back gesture when chat is open
      }
      if (activeTab === 'rate-service') {
        setActiveTab('bookings');
        setRatingBooking(null);
        return true; // handled
      }
      if (activeTab === 'track-service') {
        setActiveTab('bookings');
        setTrackingBooking(null);
        return true; // handled
      }
      if (activeTab === 'invoice') {
        setActiveTab('bookings');
        setSelectedInvoiceBooking(null);
        return true; // handled
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true; // handled
      }
      return false; // let default back action close the app
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [activeTab, chatVisible]);

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
    requestLocation();
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
              {locationName === "Location denied" || locationName === "Location error" ? (
                <TouchableOpacity 
                  style={styles.locationRefreshBtn} 
                  onPress={requestLocation}
                  activeOpacity={0.7}
                >
                  <Text style={styles.locationRefreshText}>Tap to Refresh</Text>
                  <MaterialIcons name="refresh" size={14} color="#00595c" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.locationValue} numberOfLines={1}>{locationName}</Text>
              )}
            </View>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setActiveTab('notifications')}>
              <View style={{ position: 'relative' }}>
                <MaterialIcons name="notifications" size={24} color="#3e4949" />
                {notifications.some(n => n.unread) && (
                  <View style={styles.navBarBadge} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileAvatar} onPress={() => setActiveTab('profile')}>
              <Image 
                source={{ uri: userPhoto }} 
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
          {/* Symmetrical spacer to keep title perfectly centered */}
          <View style={{ width: 40 }} />
        </View>
      )}
      {activeTab === 'rate-service' && (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => {
            setActiveTab('bookings');
            setRatingBooking(null);
          }} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#00595c" />
          </TouchableOpacity>
          <Text style={styles.profileNavTitle}>Rate Service</Text>
          <View style={{ width: 40 }} />
        </View>
      )}
      {activeTab === 'track-service' && (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => {
            setActiveTab('bookings');
            setTrackingBooking(null);
          }} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#00595c" />
          </TouchableOpacity>
          <Text style={styles.profileNavTitle}>Track Service</Text>
          <View style={{ width: 40 }} />
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

                {/* Symmetrical spacer to keep the pulse circle perfectly centered */}
                <View style={{ width: 60 }} />
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
                      setChatProviderMode(false);
                      setChatProviderName("");
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
            <TouchableOpacity 
              style={styles.suggestionBadge}
              onPress={() => {
                setChatInitialQuery("AC not cooling");
                setChatProviderMode(false);
                setChatProviderName("");
                setChatVisible(true);
              }}
            >
              <Text style={styles.suggestionText}>AC not cooling</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.suggestionBadge}
              onPress={() => {
                setChatInitialQuery("Plumber needed");
                setChatProviderMode(false);
                setChatProviderName("");
                setChatVisible(true);
              }}
            >
              <Text style={styles.suggestionText}>Plumber needed</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.suggestionBadge}
              onPress={() => {
                setChatInitialQuery("Fan making noise");
                setChatProviderMode(false);
                setChatProviderName("");
                setChatVisible(true);
              }}
            >
              <Text style={styles.suggestionText}>Fan making noise</Text>
            </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.promoButton}
              onPress={() => {
                setChatInitialQuery("Book AC service summer offer");
                setChatProviderMode(false);
                setChatProviderName("");
                setChatVisible(true);
              }}
            >
              <Text style={styles.promoButtonText}>BOOK NOW</Text>
            </TouchableOpacity>
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
           
        </TouchableOpacity>



        {/* Providers near you section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: '#1a1a2e' }}>
              Providers near you
            </Text>
            <TouchableOpacity onPress={() => router.push({
              pathname: '/providers-map',
              params: {
                latitude: userLocation?.latitude?.toString() || '',
                longitude: userLocation?.longitude?.toString() || ''
              }
            })}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#00595c' }}>
                View Map
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Providers Cards List */}
          {isLoadingProviders ? (
            <ActivityIndicator size="small" color="#00595c" style={{ marginVertical: 20 }} />
          ) : providers.length === 0 ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6e7979', textAlign: 'center', marginVertical: 10 }}>
              No providers found nearby.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              {providers.slice(0, 5).map((prov) => (
                <TouchableOpacity
                  key={prov.id}
                  style={{
                    width: 220,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#bec9c9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => router.push({
                    pathname: '/provider-profile',
                    params: {
                      id: prov.id.toString(),
                      name: prov.name,
                      service: prov.service_type || 'Specialist',
                      price: prov.hourly_rate ? `Rs ${prov.hourly_rate} Base Fee` : 'Rs 1,200 Base Fee'
                    }
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Image
                      source={
                        prov.name.includes("Ali") 
                          ? require('../../assets/images/ali_profile.png') 
                          : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(prov.name)}&background=00595c&color=fff` }
                      }
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#1a1a2e' }} numberOfLines={1}>
                        {prov.name}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6e7979' }} numberOfLines={1}>
                        {prov.service_type || 'Specialist'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="star" size={16} color="#FFB300" />
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#1a1a2e' }}>
                        {prov.rating.toFixed(1)}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#3e4949' }}>
                      {prov.location || 'Islamabad'}{prov.distance_km !== null && prov.distance_km !== undefined ? ` (${prov.distance_km.toFixed(1)} km)` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Map Component Preview */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({
              pathname: '/providers-map',
              params: {
                latitude: userLocation?.latitude?.toString() || '',
                longitude: userLocation?.longitude?.toString() || ''
              }
            })}
            style={{
              height: 180,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#bec9c9',
              marginTop: 8,
              position: 'relative',
            }}
          >
            {userLocation ? (
              <MapView
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
              >
                {/* User Marker */}
                <Marker
                  coordinate={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }}
                  title="Your Location"
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#00595c', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3 }} />
                </Marker>

                {/* Nearby Provider Markers */}
                {providers.filter(p => p.latitude && p.longitude).map((prov) => (
                  <Marker
                    key={prov.id}
                    coordinate={{
                      latitude: prov.latitude!,
                      longitude: prov.longitude!,
                    }}
                    title={prov.name}
                    description={prov.service_type}
                  >
                    <View style={{
                      backgroundColor: '#fff',
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1.5,
                      borderColor: '#00595c',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}>
                      <MaterialIcons name="construction" size={12} color="#00595c" />
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#00595c' }}>
                        {prov.name.split(' ')[0]}
                      </Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : (
              <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#00595c" />
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6e7979', marginTop: 8 }}>
                  Loading map preview...
                </Text>
              </View>
            )}

            {/* Map Overlay Badge */}
            <View style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              backgroundColor: 'rgba(0, 89, 92, 0.9)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <MaterialIcons name="fullscreen" size={16} color="#fff" />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' }}>
                Tap to Expand
              </Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* Popular Services Grid */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <Text style={styles.popularTitle}>Popular Services</Text>
          </View>
          
          <View style={styles.gridContainer}>
            {[
              { name: 'AC Technician', icon: 'ac-unit' },
              { name: 'Plumber', icon: 'plumbing' },
              { name: 'Electrician', icon: 'electrical-services' },
              { name: 'Home Cleaning', icon: 'cleaning-services' },
              { name: 'Appliance Repair', icon: 'kitchen' },
              { name: 'Carpenter', icon: 'carpenter' },
              { name: 'Painter', icon: 'format-paint' },
              { name: 'Pest Control', icon: 'pest-control' },
              { name: 'Locksmith', icon: 'vpn-key' },
              { name: 'Beautician', icon: 'face' },
              { name: 'Plumbing', icon: 'plumbing' },
              { name: 'Electrical', icon: 'electrical-services' }
            ].map((service, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.gridItem}
                onPress={() => {
                  setChatInitialQuery(`I want ${service.name}`);
                  setChatProviderMode(false);
                  setChatProviderName("");
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
        </ScrollView>
      ) : activeTab === 'profile' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainerLarge}>
              <Image 
                source={{ uri: userPhoto }} 
                style={styles.avatarImageLarge} 
              />
              
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
                {getDisplayedBookings().length}
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
            contentContainerStyle={[
              styles.scrollContent, 
              { paddingHorizontal: 20, paddingTop: 8 },
              (isLoadingBookings || getDisplayedBookings().length === 0) && { flexGrow: 1, justifyContent: 'center', paddingBottom: 120 }
            ]} 
            showsVerticalScrollIndicator={false}
          >
            {isLoadingBookings ? (
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00595c" />
                <Text style={{ marginTop: 12, color: '#6e7979', fontFamily: 'PlusJakartaSans_500Medium' }}>Loading bookings...</Text>
              </View>
            ) : getDisplayedBookings().length === 0 ? (
              <View style={styles.emptyBookingsContainer}>
                <MaterialIcons name="event-busy" size={48} color="#bec9c9" />
                <Text style={styles.emptyBookingsTitle}>No Bookings Found</Text>
                <Text style={styles.emptyBookingsSubtitle}>
                  You don't have any {selectedFilter.toLowerCase()} bookings.
                </Text>
              </View>
            ) :
              getDisplayedBookings().map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  {/* Top Header Row of card */}
                  <View style={styles.bookingCardTop}>
                    <Text style={styles.bookingId}>{booking.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: booking.badgeBg }]}>
                      {booking.status === 'Active' && (
                        <ActivityIndicator size="small" color="#FF8F00" style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.statusBadgeText, { color: booking.color }]}>
                        {booking.status === 'Active' ? 'Work in Progress' : booking.status}
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
                                onConfirm: async () => {
                                  const bAny = booking as any;
                                  if (bAny.realId) {
                                    try {
                                      await cancelBooking(bAny.realId, userId!);
                                      fetchBookings();
                                    } catch (err) {
                                      console.error("Cancel booking error:", err);
                                    }
                                  } else {
                                    setBookings(prev => prev.filter(b => b.id !== booking.id));
                                  }
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
                           <TouchableOpacity 
                             style={styles.actionBtnSec}
                             onPress={() => {
                               setTrackingBooking(booking);
                               setActiveTab('track-service');
                             }}
                           >
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
                                  setRatingBooking(booking);
                                  setActiveTab('rate-service');
                                }
                              });
                            }}
                          >
                            <Text style={styles.actionBtnTextPri}>Mark as Complete</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity 
                            style={styles.actionBtnSec}
                            onPress={() => {
                              setSelectedInvoiceBooking(booking);
                              setActiveTab('invoice');
                            }}
                          >
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
                          
                          {booking.rated && (
                            <View style={[styles.actionBtnSec, { backgroundColor: '#fcf8ff', borderColor: '#00595c' }]}>
                              <Text style={[styles.actionBtnTextSec, { color: '#00595c', fontWeight: 'bold' }]}>★ Rated</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}


          </ScrollView>
        </View>
      ) : activeTab === 'rate-service' ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.ratingScreenContainer}
        >
          <ScrollView contentContainerStyle={styles.ratingScrollContent} showsVerticalScrollIndicator={false}>
            {ratingBooking && (
              <>
                {/* Hero Provider Panel */}
                <View style={styles.ratingProviderCard}>
                  <Image source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_MXCjwGeq0GUiyK3WW6t6yqZ7TxAls0iXWQo8vCl7kmNU4HlRa0WceleGvbd1HJOROkvw5ow3lgtyXVGfS75uzsj4d-AyEoRN4SJLRiPDktmx2t1xPDrYq_q539mk4c9cYjpY4ljvJ5U03Ge1HUsRfQ6a0L3KmtJtJPCVDURdK4qJ9naUuM7h5YWxkAmGOTqN2nlM-qWh-x2H-_QR-9Dk_JBlTSSw3hUmA7D072attkBMp282axpaR5KyYW0DTyXZVsYO9JAkpmc" }} style={styles.ratingAvatar} />
                  <Text style={styles.ratingProviderName}>
                    {ratingBooking.provider === 'Assigning Provider...' ? 'Ahmed Hassan' : ratingBooking.provider}
                  </Text>
                  <Text style={styles.ratingProviderSub}>
                    {ratingBooking.providerDetail === 'Assigning AC Technician' ? 'Expert AC Technician • Service ID #4829' : ratingBooking.providerDetail}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="verified" size={16} color="#005c3e" />
                    <Text style={styles.ratingBadgeText}>Certified Professional</Text>
                  </View>
                </View>

                {/* Interactive Stars Row */}
                <View style={styles.ratingInteractiveSection}>
                  <Text style={styles.ratingLabelText}>How was your experience?</Text>
                  <View style={styles.ratingStarsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => setRatingStars(star)}
                        style={styles.ratingStarBtn}
                      >
                        <MaterialIcons 
                          name={star <= ratingStars ? "star" : "star-outline"} 
                          size={40} 
                          color={star <= ratingStars ? "#ffa000" : "#bec9c9"} 
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingStarsFeedback}>
                    {ratingStars === 1 ? 'Very Poor 😞' :
                     ratingStars === 2 ? 'Poor 😕' :
                     ratingStars === 3 ? 'Fair 😐' :
                     ratingStars === 4 ? 'Good 🙂' : 'Excellent! 😍'}
                  </Text>
                </View>

                {/* AI Karigar Insight */}
                <View style={[styles.ratingInsightCard, { marginHorizontal: 16, marginTop: 16 }]}>
                  <View style={styles.ratingInsightHeader}>
                    <MaterialIcons name="auto-awesome" size={20} color="#00595c" />
                    <Text style={styles.ratingInsightTitle}>KARIGAR INSIGHT</Text>
                  </View>
                  <Text style={styles.ratingInsightBody}>
                    Ahmed completed the service in <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>45 minutes</Text> (15 mins faster than estimated), saving you <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>PKR 250</Text> in additional labor overhead. High efficiency observed!
                  </Text>
                </View>

                {/* Detailed Invoice Summary */}
                <View style={styles.ratingInvoiceCard}>
                  <Text style={styles.ratingInvoiceTitle}>Service Receipt Summary</Text>
                  <View style={styles.ratingInvoiceRow}>
                    <Text style={styles.ratingInvoiceLabel}>{ratingBooking.serviceName}</Text>
                    <Text style={styles.ratingInvoiceValue}>{ratingBooking.price}</Text>
                  </View>
                  <View style={styles.ratingInvoiceRow}>
                    <Text style={styles.ratingInvoiceLabel}>Agentic Matching Fee</Text>
                    <Text style={styles.ratingInvoiceValue}>PKR 0 (Promo)</Text>
                  </View>
                  <View style={[styles.ratingInvoiceRow, styles.ratingInvoiceTotalRow]}>
                    <Text style={styles.ratingInvoiceTotalLabel}>Total Paid</Text>
                    <Text style={styles.ratingInvoiceTotalValue}>{ratingBooking.price}</Text>
                  </View>
                </View>

                {/* Custom Review Comments Form */}
                <View style={styles.ratingCommentsContainer}>
                  <Text style={styles.ratingLabelText}>Write a review (Optional)</Text>
                  <TextInput
                    style={styles.ratingCommentsInput}
                    placeholder="Tell us about the technician's professionalism, behavior, or quality of work..."
                    placeholderTextColor="#bec9c9"
                    multiline={true}
                    numberOfLines={4}
                    value={ratingComment}
                    onChangeText={setRatingComment}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Bottom Actions button */}
          <View style={styles.ratingFooter}>
            <TouchableOpacity 
              style={styles.ratingSubmitBtn}
              onPress={async () => {
                if (!ratingBooking) return;
                
                try {
                  if (ratingBooking.realId) {
                    await completeBooking(ratingBooking.realId, userId!, ratingStars, ratingComment);
                    fetchBookings();
                  } else {
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
                  }

                  // Fire a push notification
                  await scheduleHeadsUpNotification(
                    "Service Completed Successfully 🎉",
                    `Your service for ${ratingBooking.service} is marked as completed! Thank you for rating us ${ratingStars} stars.`
                  );

                  // Prepend to local notifications list
                  setNotifications(prev => [
                    {
                      id: Date.now(),
                      title: "Service Completed 🎉",
                      description: `Your booking for ${ratingBooking.service} has been completed successfully. Thank you for your feedback!`,
                      time: "Just now",
                      icon: "verified",
                      iconColor: "#005c3e",
                      bgColor: "rgba(0, 92, 62, 0.08)",
                      unread: true
                    },
                    ...prev
                  ]);
                } catch (err) {
                  console.error("Complete booking error:", err);
                }
                
                // Transition tab selections
                setSelectedFilter('Completed');
                setActiveTab('bookings');
                
                // Clear ratings states
                setRatingBooking(null);
                setRatingStars(5);
                setRatingComment("");
              }}
            >
              <Text style={styles.ratingSubmitText}>Submit Feedback</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : activeTab === 'track-service' ? (() => {
          const userLat = userLocation?.latitude || 24.8922;
          const userLng = userLocation?.longitude || 67.0747;
          const providerLat = userLat + 0.005;
          const providerLng = userLng - 0.006;
          
          return (
            <ScrollView style={styles.trackScreenContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Fullscreen Map Modal */}
              <Modal
                visible={isFullscreenMap}
                animationType="slide"
                onRequestClose={() => setIsFullscreenMap(false)}
              >
                <View style={styles.fullscreenMapContainer}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${providerLat},${providerLng}&destination=${userLat},${userLng}&mode=driving`}
                    />
                  ) : (
                    <MapView
                      style={{ width: '100%', height: '100%' }}
                      initialRegion={{
                        latitude: (userLat + providerLat) / 2,
                        longitude: (userLng + providerLng) / 2,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                    >
                      {/* User Marker */}
                      <Marker
                        coordinate={{ latitude: userLat, longitude: userLng }}
                        title="You"
                        description="Your current location"
                      >
                        <View style={styles.trackMapHomeIconBg}>
                          <MaterialIcons name="home" size={20} color="#ffffff" />
                        </View>
                      </Marker>

                      {/* Service Provider Marker */}
                      <Marker
                        coordinate={{ latitude: providerLat, longitude: providerLng }}
                        title="Ahmed Khan"
                        description="Technician is en route"
                      >
                        <View style={styles.trackMapDriverIconBg}>
                          <MaterialIcons name="directions-bike" size={20} color="#ffffff" />
                        </View>
                      </Marker>

                      {/* Polyline Route */}
                      <Polyline
                        coordinates={[
                          { latitude: providerLat, longitude: providerLng },
                          { latitude: userLat, longitude: userLng }
                        ]}
                        strokeColor="#00595c"
                        strokeWidth={5}
                        lineDashPattern={[5, 5]}
                      />
                    </MapView>
                  )}

                  {/* Floating Back Button */}
                  <TouchableOpacity 
                    style={styles.fullscreenMapCloseBtn} 
                    onPress={() => setIsFullscreenMap(false)}
                  >
                    <MaterialIcons name="arrow-back" size={24} color="#00595c" />
                  </TouchableOpacity>

                  {/* Floating Info Card */}
                  <View style={styles.fullscreenMapEtaCard}>
                    <View style={styles.fullscreenMapEtaHeader}>
                      <MaterialIcons name="navigation" size={20} color="#00595c" style={{ transform: [{ rotate: '45deg' }] }} />
                      <Text style={styles.fullscreenMapEtaTitle}>Technician Live Tracking</Text>
                    </View>
                    <Text style={styles.fullscreenMapEtaText}>
                      Ahmed Khan is en route to Gulshan-e-Iqbal.
                    </Text>
                    <View style={styles.fullscreenMapEtaSubRow}>
                      <Text style={styles.fullscreenMapEtaValue}>ETA: 12 minutes</Text>
                      <Text style={styles.fullscreenMapEtaDist}>• 2.4 km remaining</Text>
                    </View>
                  </View>
                </View>
              </Modal>

              {/* Immersive Map Preview (Expands on Press) */}
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setIsFullscreenMap(true)} 
                style={styles.trackMapContainer}
              >
                {Platform.OS === 'web' ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${providerLat},${providerLng}&destination=${userLat},${userLng}&mode=driving`}
                  />
                ) : (
                  <MapView
                    style={{ width: '100%', height: '100%' }}
                    initialRegion={{
                      latitude: (userLat + providerLat) / 2,
                      longitude: (userLng + providerLng) / 2,
                      latitudeDelta: 0.015,
                      longitudeDelta: 0.015,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    {/* User Marker */}
                    <Marker
                      coordinate={{ latitude: userLat, longitude: userLng }}
                    >
                      <View style={styles.trackMapHomeIconBg}>
                        <MaterialIcons name="home" size={20} color="#ffffff" />
                      </View>
                    </Marker>

                    {/* Service Provider Marker */}
                    <Marker
                      coordinate={{ latitude: providerLat, longitude: providerLng }}
                    >
                      <View style={styles.trackMapDriverIconBg}>
                        <MaterialIcons name="directions-bike" size={20} color="#ffffff" />
                      </View>
                    </Marker>

                    {/* Polyline Route */}
                    <Polyline
                      coordinates={[
                        { latitude: providerLat, longitude: providerLng },
                        { latitude: userLat, longitude: userLng }
                      ]}
                      strokeColor="#00595c"
                      strokeWidth={4}
                      lineDashPattern={[5, 5]}
                    />
                  </MapView>
                )}

                {/* Fullscreen Expand Action Floating overlay tag */}
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 2,
                }}>
                  <MaterialIcons name="zoom-out-map" size={14} color="#00595c" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#00595c' }}>EXPAND</Text>
                </View>

                {/* Floating ETA Badge */}
                <View style={styles.trackEtaBadge}>
                  <View style={styles.trackEtaIconBg}>
                    <MaterialIcons name="navigation" size={16} color="#00595c" style={{ transform: [{ rotate: '45deg' }] }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackEtaTitle}>Ahmed Khan is en route</Text>
                    <Text style={styles.trackEtaSubtitle}>ETA: 12 mins • 2.4 km away</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Technician Profile Card */}
              <View style={styles.trackTechnicianCard}>
                <View style={styles.trackTechHeader}>
                  <Image 
                    source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_MXCjwGeq0GUiyK3WW6t6yqZ7TxAls0iXWQo8vCl7kmNU4HlRa0WceleGvbd1HJOROkvw5ow3lgtyXVGfS75uzsj4d-AyEoRN4SJLRiPDktmx2t1xPDrYq_q539mk4c9cYjpY4ljvJ5U03Ge1HUsRfQ6a0L3KmtJtJPCVDURdK4qJ9naUuM7h5YWxkAmGOTqN2nlM-qWh-x2H-_QR-9Dk_JBlTSSw3hUmA7D072attkBMp282axpaR5KyYW0DTyXZVsYO9JAkpmc" }} 
                    style={styles.trackTechAvatar} 
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.trackTechName}>Ahmed Khan</Text>
                      <MaterialIcons name="verified" size={16} color="#005c3e" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.trackTechSub}>
                      {trackingBooking ? `Order ID: ${trackingBooking.id}` : 'Order ID: #KG-482910'}
                    </Text>
                    <Text style={styles.trackTechService}>
                      {trackingBooking ? trackingBooking.service : 'AC Repair & Service'}
                    </Text>
                  </View>
                </View>

                {/* Quick Actions Row */}
                <View style={styles.trackActionsRow}>
                  <TouchableOpacity 
                    style={styles.trackActionBtnSec} 
                    onPress={() => Linking.openURL('tel:+923018206192')}
                  >
                    <MaterialIcons name="phone" size={18} color="#00595c" />
                    <Text style={styles.trackActionTextSec}>Call Technician</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.trackActionBtnPri} 
                    onPress={() => {
                      setChatInitialQuery("Where have you reached, Ahmed?");
                      setChatProviderMode(true);
                      setChatProviderName("Ahmed Khan");
                      setChatVisible(true);
                    }}
                  >
                    <MaterialIcons name="chat" size={18} color="#ffffff" />
                    <Text style={styles.trackActionTextPri}>Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stepper Timeline Progress */}
              <View style={styles.trackTimelineCard}>
                <Text style={styles.trackTimelineHeaderTitle}>SERVICE PROGRESS</Text>
                
                {/* Timeline Stepper */}
                <View style={styles.trackTimelineWrapper}>
                  
                  {/* Item 1: Confirmed */}
                  <View style={styles.trackTimelineItem}>
                    <View style={styles.trackTimelineIndicatorContainer}>
                      <View style={styles.trackTimelineBulletDone}>
                        <MaterialIcons name="check" size={12} color="#ffffff" />
                      </View>
                      <View style={styles.trackTimelineLineDone} />
                    </View>
                    <View style={styles.trackTimelineContent}>
                      <Text style={styles.trackTimelineTitleDone}>Confirmed</Text>
                      <Text style={styles.trackTimelineSubtitleDone}>Technician assigned at 10:30 AM</Text>
                    </View>
                  </View>

                  {/* Item 2: En Route */}
                  <View style={styles.trackTimelineItem}>
                    <View style={styles.trackTimelineIndicatorContainer}>
                      <View style={styles.trackTimelineBulletActive}>
                        <View style={styles.trackTimelineBulletActiveInner} />
                      </View>
                      <View style={styles.trackTimelineLinePending} />
                    </View>
                    <View style={styles.trackTimelineContent}>
                      <Text style={styles.trackTimelineTitleActive}>En Route</Text>
                      <Text style={styles.trackTimelineSubtitleActive}>Technician is heading to your location</Text>
                    </View>
                  </View>

                  {/* Item 3: In Progress */}
                  <View style={styles.trackTimelineItem}>
                    <View style={styles.trackTimelineIndicatorContainer}>
                      <View style={styles.trackTimelineBulletPending} />
                      <View style={styles.trackTimelineLinePending} />
                    </View>
                    <View style={styles.trackTimelineContent}>
                      <Text style={styles.trackTimelineTitlePending}>In Progress</Text>
                      <Text style={styles.trackTimelineSubtitlePending}>Work will start upon arrival</Text>
                    </View>
                  </View>

                  {/* Item 4: Completed */}
                  <View style={[styles.trackTimelineItem, { marginBottom: 0 }]}>
                    <View style={styles.trackTimelineIndicatorContainer}>
                      <View style={styles.trackTimelineBulletPending} />
                    </View>
                    <View style={styles.trackTimelineContent}>
                      <Text style={styles.trackTimelineTitlePending}>Completed</Text>
                      <Text style={styles.trackTimelineSubtitlePending}>Awaiting completion signal</Text>
                    </View>
                  </View>

                </View>
              </View>

              {/* Support CTA Info Row */}
              <View style={styles.trackSupportCard}>
                <MaterialIcons name="help-outline" size={20} color="#005c3e" />
                <Text style={styles.trackSupportText}>
                  Need help? <Text style={styles.trackSupportLink} onPress={() => {}}>Contact Support</Text> available 24/7 for active service bookings.
                </Text>
              </View>
            </ScrollView>
          );
        })()
      : activeTab === 'invoice' ? (() => {
          if (!selectedInvoiceBooking) return null;
          const invoiceDetails = getInvoiceDetails(selectedInvoiceBooking.price);
          
          return (
            <View style={styles.invoiceScreenContainer}>
              {/* Header Bar */}
              <View style={styles.invoiceHeaderBar}>
                <View style={styles.invoiceHeaderLeft}>
                  <TouchableOpacity 
                    onPress={() => setActiveTab('bookings')} 
                    style={styles.invoiceBackBtn}
                  >
                    <MaterialIcons name="arrow-back" size={24} color="#00595c" />
                  </TouchableOpacity>
                  <Text style={styles.invoiceHeaderTitle}>Service Invoice</Text>
                </View>
                <TouchableOpacity style={styles.invoiceMoreBtn}>
                  <MaterialIcons name="more-vert" size={24} color="#00595c" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.invoiceScroll} 
                contentContainerStyle={styles.invoiceContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Status & Header Section */}
                <View style={styles.invoiceStatusSection}>
                  <View style={styles.invoiceCheckContainer}>
                    <MaterialIcons name="check-circle" size={56} color="#005c3e" />
                  </View>
                  <View style={styles.invoicePaidBadge}>
                    <Text style={styles.invoicePaidText}>PAID</Text>
                  </View>
                  <Text style={styles.invoiceNumberText}>Invoice #INV-88291</Text>
                  <Text style={styles.invoiceDateText}>Date: {selectedInvoiceBooking.date}</Text>
                </View>

                {/* Service Details Card */}
                <View style={styles.invoiceCard}>
                  <View style={styles.invoiceServiceHeader}>
                    <Image 
                      source={require('../../assets/images/app-icon/icon.png')} 
                      style={styles.invoiceAppLogo} 
                    />
                    <View style={styles.invoiceServiceMeta}>
                      <Text style={styles.invoiceServiceName}>{selectedInvoiceBooking.service}</Text>
                      <Text style={styles.invoiceProviderName}>{selectedInvoiceBooking.provider}</Text>
                    </View>
                  </View>
                  <View style={styles.invoiceDivider} />
                  <View style={styles.invoiceScheduleRow}>
                    <View style={styles.invoiceScheduleItem}>
                      <MaterialIcons name="event" size={16} color="#6e7979" />
                      <Text style={styles.invoiceScheduleText}>{selectedInvoiceBooking.date}</Text>
                    </View>
                    <View style={styles.invoiceScheduleItem}>
                      <MaterialIcons name="access-time" size={16} color="#6e7979" />
                      <Text style={styles.invoiceScheduleText}>{selectedInvoiceBooking.time.split(" - ")[0]}</Text>
                    </View>
                  </View>
                </View>

                {/* Billing Breakdown */}
                <View style={styles.invoiceCard}>
                  <Text style={styles.invoiceBillingTitle}>BILLING DETAILS</Text>
                  <View style={styles.invoiceBillingRow}>
                    <Text style={styles.invoiceBillingLabel}>Base Service Fee</Text>
                    <Text style={styles.invoiceBillingValue}>{invoiceDetails.baseFee}</Text>
                  </View>
                  <View style={styles.invoiceBillingRow}>
                    <Text style={styles.invoiceBillingLabel}>Distance Fee</Text>
                    <Text style={styles.invoiceBillingValue}>{invoiceDetails.distanceFee}</Text>
                  </View>
                  <View style={styles.invoiceBillingRow}>
                    <Text style={styles.invoiceBillingLabel}>Urgency Fee</Text>
                    <Text style={styles.invoiceBillingValue}>{invoiceDetails.urgencyFee}</Text>
                  </View>
                  
                  {/* Promo & Credit */}
                  <View style={styles.invoiceBillingRow}>
                    <View style={styles.invoicePromoLabelContainer}>
                      <MaterialIcons name="redeem" size={16} color="#005c3e" />
                      <Text style={[styles.invoiceBillingLabel, { color: '#005c3e', marginLeft: 4 }]}>Discount (Promo)</Text>
                    </View>
                    <Text style={[styles.invoiceBillingValue, { color: '#005c3e' }]}>{invoiceDetails.discount}</Text>
                  </View>
                  
                  <View style={styles.invoiceBillingRow}>
                    <View style={styles.invoicePromoLabelContainer}>
                      <MaterialIcons name="account-balance-wallet" size={16} color="#005c3e" />
                      <Text style={[styles.invoiceBillingLabel, { color: '#005c3e', marginLeft: 4 }]}>Wallet Credit Used</Text>
                    </View>
                    <Text style={[styles.invoiceBillingValue, { color: '#005c3e' }]}>{invoiceDetails.walletCredit}</Text>
                  </View>
                  
                  <View style={styles.invoiceDivider} />
                  
                  <View style={[styles.invoiceBillingRow, { marginTop: 8 }]}>
                    <Text style={styles.invoiceTotalLabel}>Total Amount Paid</Text>
                    <Text style={styles.invoiceTotalValue}>{invoiceDetails.totalPaid}</Text>
                  </View>
                </View>

                {/* Payment Method */}
                <View style={styles.invoiceCard}>
                  <View style={styles.invoicePaymentRow}>
                    <View style={styles.invoicePaymentLeft}>
                      <View style={styles.invoiceCashLogoContainer}>
                        <MaterialIcons name="payments" size={22} color="#005c3e" />
                      </View>
                      <View>
                        <Text style={styles.invoicePaymentTitle}>PAYMENT METHOD</Text>
                        <Text style={styles.invoicePaymentDetail}>Cash</Text>
                      </View>
                    </View>
                    <MaterialIcons name="check-circle" size={18} color="#005c3e" />
                  </View>
                </View>
              </ScrollView>

              {/* Bottom Actions Section */}
              <View style={styles.invoiceFooter}>
                <TouchableOpacity 
                  style={styles.invoiceDownloadBtn}
                  onPress={() => {
                    downloadInvoicePdf(selectedInvoiceBooking);
                  }}
                >
                  <MaterialIcons name="file-download" size={18} color="#00595c" />
                  <Text style={styles.invoiceDownloadText}>Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.invoiceHomeBtn}
                  onPress={() => {
                    setActiveTab('home');
                  }}
                >
                  <Text style={styles.invoiceHomeText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()
      : activeTab === 'notifications' ? (() => {
          return (
            <View style={styles.notifContainer}>
              {/* Notifications Header */}
              <View style={styles.notifHeaderBar}>
                <TouchableOpacity onPress={() => setActiveTab('home')} style={styles.notifBackBtn}>
                  <MaterialIcons name="arrow-back" size={24} color="#00595c" />
                </TouchableOpacity>
                <Text style={styles.notifHeaderTitle}>Notifications</Text>
                <TouchableOpacity style={styles.notifMarkReadBtn} onPress={handleMarkAllAsRead}>
                  <MaterialIcons name="done-all" size={20} color="#00595c" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.notifScroll}
                contentContainerStyle={styles.notifScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    onPress={() => handleMarkAsRead(item.id)}
                    activeOpacity={0.8}
                    style={[styles.notifCard, item.unread && styles.notifCardUnread]}
                  >
                    <View style={[styles.notifIconWrapper, { backgroundColor: item.bgColor }]}>
                      <MaterialIcons name={item.icon as any} size={22} color={item.iconColor} />
                    </View>
                    
                    <View style={styles.notifContent}>
                      <View style={styles.notifMetaRow}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.notifDesc}>{item.description}</Text>
                    </View>
                    
                    {item.unread && <View style={styles.notifUnreadBadge} />}
                  </TouchableOpacity>
                ))}

                {/* All Caught Up Card */}
                {!notifications.some(n => n.unread) && (
                  <View style={styles.caughtUpCard}>
                    <View style={styles.caughtUpIconWrapper}>
                      <MaterialIcons name="done-all" size={32} color="#00595c" />
                    </View>
                    <Text style={styles.caughtUpTitle}>All Caught Up!</Text>
                    <Text style={styles.caughtUpSubtitle}>
                      No new notifications at the moment. We'll alert you when something important happens.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })()
      : (
        <View style={styles.comingSoonContainer}>
          <MaterialIcons name="construction" size={64} color="#00595c" />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonSubtitle}>We're working hard on this feature.</Text>
        </View>
      )}



      {/* Bottom Navigation Shell */}
      {activeTab !== 'rate-service' && activeTab !== 'track-service' && activeTab !== 'invoice' && (
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
            <View style={{ position: 'relative' }}>
              <MaterialIcons name="notifications" size={24} color={activeTab === 'notifications' ? '#00595c' : '#3e4949'} />
              {notifications.some(n => n.unread) && (
                <View style={styles.navBarBadge} />
              )}
            </View>
            <Text style={[styles.navText, activeTab === 'notifications' && { color: '#00595c' }]}>Notifications</Text>
            {activeTab === 'notifications' && <View style={styles.navActiveIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
            <MaterialIcons name="person" size={24} color={activeTab === 'profile' ? '#00595c' : '#3e4949'} />
            <Text style={[styles.navText, activeTab === 'profile' && { color: '#00595c' }]}>Profile</Text>
            {activeTab === 'profile' && <View style={styles.navActiveIndicator} />}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>

    <ChatBottomSheet
      visible={chatVisible}
      initialQuery={chatInitialQuery}
      onClose={() => {
        setChatVisible(false);
        setChatInitialQuery("");
        setChatProviderMode(false);
        setChatProviderName("");
        setAssistantMessages([]);
        setProviderMessages([]);
      }}
      userId={userId}
      userName={userName}
      providerMode={chatProviderMode}
      providerName={chatProviderName}
      messages={chatProviderMode ? providerMessages : assistantMessages}
      setMessages={chatProviderMode ? setProviderMessages : setAssistantMessages}
      onNavigateToBookings={() => setActiveTab('bookings')}
      userLocation={userLocation}
      locationName={locationName}
    />



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

    {/* Location Permission Instruction Modal */}
    <Modal
      visible={locationModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setLocationModalVisible(false)}
    >
      <View style={styles.locModalOverlay}>
        <View style={styles.locModalContent}>
          <View style={styles.locModalHeader}>
            <View style={styles.locModalIconContainer}>
              <MaterialIcons name="location-off" size={32} color="#cc3300" />
            </View>
            <Text style={styles.locModalTitle}>Enable Location Access</Text>
            <Text style={styles.locModalDescription}>
              Karigar.ai needs your location to search for active specialists and technicians nearest to you.
            </Text>
          </View>

          <View style={styles.locInstructionsContainer}>
            <Text style={styles.locInstructionTitle}>How to enable permissions:</Text>
            
            <View style={styles.locStepRow}>
              <View style={styles.locStepNumber}><Text style={styles.locStepNumberText}>1</Text></View>
              <Text style={styles.locStepText}>Tap the <Text style={{fontWeight: 'bold'}}>Open Settings</Text> button below.</Text>
            </View>
            
            <View style={styles.locStepRow}>
              <View style={styles.locStepNumber}><Text style={styles.locStepNumberText}>2</Text></View>
              <Text style={styles.locStepText}>Select <Text style={{fontWeight: 'bold'}}>Permissions</Text> in App settings.</Text>
            </View>

            <View style={styles.locStepRow}>
              <View style={styles.locStepNumber}><Text style={styles.locStepNumberText}>3</Text></View>
              <Text style={styles.locStepText}>Tap <Text style={{fontWeight: 'bold'}}>Location</Text> and choose <Text style={{fontWeight: 'bold'}}>Allow while using app</Text>.</Text>
            </View>
          </View>

          <View style={styles.locModalActions}>
            <TouchableOpacity 
              style={styles.locModalCancelBtn}
              onPress={() => setLocationModalVisible(false)}
            >
              <Text style={styles.locModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.locModalSettingsBtn}
              onPress={() => {
                setLocationModalVisible(false);
                Linking.openSettings();
              }}
            >
              <Text style={styles.locModalSettingsText}>Open Settings</Text>
              <MaterialIcons name="open-in-new" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  locationRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 89, 92, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  locationRefreshText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#00595c',
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
    minHeight: 80,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00595c',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIconLeft: {
    marginRight: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
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
  fullscreenMapContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    position: 'relative',
  },
  fullscreenMapCloseBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 10,
  },
  fullscreenMapEtaCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    zIndex: 10,
  },
  fullscreenMapEtaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullscreenMapEtaTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#1a1a2e',
  },
  fullscreenMapEtaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6e7979',
    marginTop: 8,
  },
  fullscreenMapEtaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f3',
  },
  fullscreenMapEtaValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#00595c',
  },
  fullscreenMapEtaDist: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#3e4949',
    marginLeft: 4,
  },
  trackScreenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  trackMapContainer: {
    height: 250,
    backgroundColor: '#efecff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e0fc',
  },
  trackMapBackground: {
    flex: 1,
    backgroundColor: '#f5f5f9',
    position: 'relative',
  },
  trackMapGridLineH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 4,
    backgroundColor: '#ffffff',
  },
  trackMapGridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 4,
    backgroundColor: '#ffffff',
  },
  trackMapGridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 4,
    backgroundColor: '#ffffff',
  },
  trackMapGridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 4,
    backgroundColor: '#ffffff',
  },
  trackMapRoutePath: {
    position: 'absolute',
    left: '30%',
    top: '25%',
    width: '40%',
    height: '40%',
    borderColor: '#00595c',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderRadius: 100,
  },
  trackMapDriverMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -16,
    marginTop: -16,
  },
  trackMapPulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 89, 92, 0.2)',
    borderWidth: 1.5,
    borderColor: '#00595c',
  },
  trackMapDriverIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  trackMapHomeMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -16,
    marginTop: -16,
  },
  trackMapHomeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ae2f34',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  trackEtaBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  trackEtaIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trackEtaTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  trackEtaSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#3e4949',
    marginTop: 2,
  },
  trackTechnicianCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  trackTechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackTechAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  trackTechName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#1a1a2e',
  },
  trackTechSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#6e7979',
    marginTop: 2,
  },
  trackTechService: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#00595c',
    marginTop: 4,
  },
  trackActionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  trackActionBtnSec: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#00595c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackActionTextSec: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#00595c',
  },
  trackActionBtnPri: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#00595c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackActionTextPri: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  trackTimelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  trackTimelineHeaderTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#6e7979',
    marginBottom: 16,
  },
  trackTimelineWrapper: {
    paddingLeft: 4,
  },
  trackTimelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  trackTimelineIndicatorContainer: {
    alignItems: 'center',
    width: 24,
  },
  trackTimelineBulletDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#005c3e',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  trackTimelineBulletActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0f2f1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: '#00595c',
  },
  trackTimelineBulletActiveInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00595c',
  },
  trackTimelineBulletPending: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#bec9c9',
    zIndex: 2,
    marginTop: 2,
  },
  trackTimelineLineDone: {
    width: 2,
    position: 'absolute',
    top: 20,
    bottom: -20,
    backgroundColor: '#005c3e',
    zIndex: 1,
  },
  trackTimelineLinePending: {
    width: 2,
    position: 'absolute',
    top: 20,
    bottom: -20,
    backgroundColor: '#bec9c9',
    zIndex: 1,
  },
  trackTimelineContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  trackTimelineTitleDone: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#005c3e',
  },
  trackTimelineSubtitleDone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#6e7979',
    marginTop: 2,
  },
  trackTimelineTitleActive: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#00595c',
  },
  trackTimelineSubtitleActive: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#3e4949',
    marginTop: 2,
  },
  trackTimelineTitlePending: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#6e7979',
  },
  trackTimelineSubtitlePending: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#bec9c9',
    marginTop: 2,
  },
  trackSupportCard: {
    backgroundColor: '#e8fff5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#005c3e',
  },
  trackSupportText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#005c3e',
    lineHeight: 18,
  },
  trackSupportLink: {
    textDecorationLine: 'underline',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  ratingScreenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  ratingModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    justifyContent: 'flex-end',
  },
  ratingBottomSheet: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '95%',
    overflow: 'hidden',
  },
  ratingSheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#bec9c9',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
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
  ratingInsightBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#00331e',
    lineHeight: 18,
  },
  ratingLabelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#1a1a2e',
  },
  ratingInvoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#eef2f2',
    gap: 12,
  },
  ratingInvoiceTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  ratingInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingInvoiceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6e7979',
  },
  ratingInvoiceValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  ratingInvoiceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f2',
    paddingTop: 12,
    marginTop: 4,
  },
  ratingInvoiceTotalLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  ratingInvoiceTotalValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#00595c',
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
  },
  ratingProviderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef2f2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ratingAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  ratingProviderName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  ratingProviderSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6e7979',
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8fff5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#005c3e',
  },
  ratingInteractiveSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef2f2',
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  ratingStarBtn: {
    padding: 4,
  },
  ratingStarsFeedback: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#00595c',
  },
  ratingCommentsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#eef2f2',
  },
  ratingCommentsInput: {
    borderWidth: 1,
    borderColor: '#bec9c9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1a1a2e',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  invoiceScreenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  invoiceAppLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 16,
  },
  invoiceHeaderBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
  },
  invoiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceBackBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  invoiceHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  invoiceMoreBtn: {
    padding: 8,
  },
  invoiceScroll: {
    flex: 1,
  },
  invoiceContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 160,
  },
  invoiceStatusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  invoiceCheckContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,92,62,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  invoicePaidBadge: {
    backgroundColor: 'rgba(0,92,62,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  invoicePaidText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#005c3e',
    letterSpacing: 1,
  },
  invoiceNumberText: {
    fontSize: 14,
    color: '#3e4949',
    marginBottom: 4,
  },
  invoiceDateText: {
    fontSize: 12,
    color: '#6e7979',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceServiceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0,89,92,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  invoiceServiceMeta: {
    flex: 1,
  },
  invoiceServiceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  invoiceProviderName: {
    fontSize: 14,
    color: '#3e4949',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#bec9c9',
    marginVertical: 16,
  },
  invoiceScheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceScheduleText: {
    fontSize: 12,
    color: '#6e7979',
    marginLeft: 6,
  },
  invoiceBillingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6e7979',
    letterSpacing: 1,
    marginBottom: 16,
  },
  invoiceBillingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceBillingLabel: {
    fontSize: 14,
    color: '#3e4949',
  },
  invoiceBillingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  invoicePromoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  invoicePaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoicePaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceCashLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,92,62,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  invoicePaymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6e7979',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  invoicePaymentDetail: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  invoiceFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#bec9c9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  invoiceDownloadBtn: {
    height: 48,
    borderWidth: 2,
    borderColor: '#00595c',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  invoiceDownloadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00595c',
    marginLeft: 8,
  },
  invoiceHomeBtn: {
    height: 48,
    backgroundColor: '#00595c',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceHomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  locModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  locModalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  locModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(204, 51, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locModalTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  locModalDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6e7979',
    textAlign: 'center',
    lineHeight: 20,
  },
  locInstructionsContainer: {
    backgroundColor: '#fcf8ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    marginBottom: 24,
  },
  locInstructionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
    marginBottom: 12,
  },
  locStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locStepNumberText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  locStepText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3e4949',
    flex: 1,
  },
  locModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  locModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locModalCancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#00595c',
  },
  locModalSettingsBtn: {
    flex: 1.5,
    backgroundColor: '#00595c',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locModalSettingsText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  notifContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  notifHeaderBar: {
    height: 64,
    backgroundColor: '#fcf8ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
  },
  notifBackBtn: {
    padding: 8,
  },
  notifHeaderTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#1a1a2e',
  },
  notifMarkReadBtn: {
    padding: 8,
  },
  notifScroll: {
    flex: 1,
  },
  notifScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderColor: '#efecff',
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#00595c',
  },
  notifIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#1a1a2e',
    flex: 1,
  },
  notifTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6e7979',
    marginLeft: 8,
  },
  notifDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3e4949',
    lineHeight: 18,
  },
  notifUnreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ae2f34',
  },
  caughtUpCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bec9c9',
    borderStyle: 'dashed',
  },
  caughtUpIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 89, 92, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  caughtUpTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  caughtUpSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
    textAlign: 'center',
    lineHeight: 18,
  },
  navBarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ae2f34',
    borderWidth: 1.5,
    borderColor: '#fff',
  }
});
