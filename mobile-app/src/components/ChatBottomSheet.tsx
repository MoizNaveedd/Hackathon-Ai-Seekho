import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter, useNavigation } from 'expo-router';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { transcribeVoiceLive } from '../services/transcriptionService';
import { chat, type ChatResponse, type Provider } from '../services/apiService';
import { scheduleHeadsUpNotification } from '../services/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  audioUri?: string;
  timestamp: Date;
  selectable?: boolean;
  providers?: Provider[] | null;
  bookingProposal?: BookingProposal | null;
  proposalStatus?: 'pending' | 'confirmed' | 'declined';
  isCompleted?: boolean;
  requireLocation?: boolean;
}

interface BookingProposal {
  service: string;
  provider: string;
  time: string;
  price: string;
  provider_id?: number;
}

interface Props {
  visible: boolean;
  initialQuery?: string;
  onClose: () => void;
  userName: string;
  userId?: number | null;
  providerMode?: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onNavigateToBookings?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  locationName?: string;
  providerName?: string;
  sessionId?: number | null;
  isLoadingHistory?: boolean;
}

// ─── Voice Player Component ──────────────────────────────────────────────────
function VoiceMessagePlayer({ uri, isUser }: { uri: string; isUser: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  async function togglePlayback() {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          // If it reached the end, restart it
          if (status.didJustFinish || status.positionMillis >= (status.durationMillis || 0)) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const formatAudioTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.voicePlayer}>
      <TouchableOpacity onPress={togglePlayback} style={[styles.playBtn, isUser ? styles.userPlayBtn : styles.aiPlayBtn]}>
        <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={20} color={isUser ? "#00595c" : "#fff"} />
      </TouchableOpacity>
      <View style={[styles.waveformContainer, isUser ? styles.userWaveformBg : styles.aiWaveformBg]}>
        <View 
          style={[
            styles.waveformProgress, 
            { width: `${(position / (duration || 1)) * 100}%` },
            isUser ? styles.userWaveform : styles.aiWaveform
          ]} 
        />
      </View>
      <Text style={[styles.audioDuration, isUser ? styles.userBubbleTime : styles.aiBubbleTime]}>
        {formatAudioTime(isPlaying ? position : duration)}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatBottomSheet({ visible, initialQuery, onClose, userName, userId, providerMode = false, providerName = "Ahmed Khan", messages, setMessages, onNavigateToBookings, userLocation, locationName, sessionId, isLoadingHistory }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingProposal, setBookingProposal] = useState<BookingProposal | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showNavigateConfirm, setShowNavigateConfirm] = useState(false);
  const [whyHimModalVisible, setWhyHimModalVisible] = useState(false);
  const [selectedWhyHimProvider, setSelectedWhyHimProvider] = useState<Provider | null>(null);

  const handleWhyHimPress = (provider: Provider) => {
    setSelectedWhyHimProvider(provider);
    setWhyHimModalVisible(true);
  };
  // Real API response state
  const [lastChatResponse, setLastChatResponse] = useState<ChatResponse | null>(null);
  
  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const isCancelledRef = useRef(false);
  const activeSessionRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);

  // Map selection states
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [pickerRegion, setPickerRegion] = useState({
    latitude: 24.8608,
    longitude: 67.0104,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  const [markerCoord, setMarkerCoord] = useState({
    latitude: 24.8608,
    longitude: 67.0104,
  });
  const mapPickerRef = useRef<MapView | null>(null);

  const openMapPicker = async () => {
    let lat = 24.8608;
    let lng = 67.0104;

    if (userLocation) {
      lat = userLocation.latitude;
      lng = userLocation.longitude;
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (e) {
        console.warn("Failed to get current location for map picker:", e);
      }
    }

    const initialRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };

    setMarkerCoord({ latitude: lat, longitude: lng });
    setPickerRegion(initialRegion);
    setMapPickerVisible(true);
    
    // Animate map ref if it's already mounted
    setTimeout(() => {
      mapPickerRef.current?.animateToRegion(initialRegion, 1);
    }, 100);
  };

  const handleChooseLocation = async () => {
    setMapPickerVisible(false);
    const lat = markerCoord.latitude;
    const lng = markerCoord.longitude;

    let areaName = '';

    // Attempt actual reverse geocoding if permission is granted
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const { city, district, region, subregion, name, street } = reverseGeocode[0];
          areaName = district || subregion || city || name || street || '';
        }
      }
    } catch (err) {
      console.warn("Geocoding failed, falling back to mock area:", err);
    }

    // Fallback to predefined mock areas if geocoding didn't return a name
    if (!areaName) {
      const karachiAreas = [
        'Clifton',
        'Gulshan-e-Iqbal',
        'DHA Phase 6',
        'Saddar',
        'PECHS',
        'North Nazimabad',
        'Bahria Town',
        'Korangi',
        'Federal B Area',
        'Malir Cantt'
      ];
      areaName = karachiAreas[Math.floor(Math.random() * karachiAreas.length)];
    }

    const displayText = `My location is ${areaName}`;
    
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text: displayText, timestamp: new Date() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    
    fetchReply(displayText, updatedHistory, undefined, { 
      latitude: lat, 
      longitude: lng, 
      location_name: areaName 
    });
  };

  // Slide up when visible
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      
      if (initialQuery && messages.length === 0) {
        // Seed the first user text message and get AI reply
        const firstMsg: Message = { id: 'u0', role: 'user', text: initialQuery, timestamp: new Date() };
        setMessages([firstMsg]);
        fetchReply(initialQuery, [firstMsg]);
      }
      if (sessionId) {
        sessionIdRef.current = sessionId;
      }
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
      // Reset state when closed, keeping messages preserved
      setInputText('');
      setBookingProposal(null);
      setIsTyping(false);
      setShowCloseConfirm(false);
      setShowNavigateConfirm(false);
      setIsRecording(false);
      // Removed resetting sessionId here so we can keep the session alive if we reopen
    }
  }, [visible, messages.length]);

  // Reset session when messages are cleared (new chat)
  useEffect(() => {
    if (messages.length === 0) {
      sessionIdRef.current = null;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!visible) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent going back when the sheet is visible
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation, visible]);

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

  // Keyboard listeners — slide sheet up/down with keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardAnim, {
          toValue: -e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping, bookingProposal]);

  async function fetchReply(
    text: string, 
    currentHistory: Message[], 
    selection?: { provider_id: number; slot: string; date: string },
    customLocation?: { latitude: number; longitude: number; location_name: string }
  ) {
    setIsTyping(true);
    try {
      let reply = "";
      let proposal = null;
      let selectable = false;
      let providers = null;
      let isCompleted = false;
      let requireLocation = false;

      if (providerMode) {
        // Mock provider responses (provider-to-user chat, not AI)
        await new Promise(r => setTimeout(r, 1500));
        const lower = text.toLowerCase();
        if (lower.includes('where') || lower.includes('reach') || lower.includes('kahan') || lower.includes('time') || lower.includes('status')) {
          reply = `Ji, I am on my way! Currently near the main road, should be at your location in about 10 to 12 minutes.`;
        } else if (lower.includes('tool') || lower.includes('gas') || lower.includes('part') || lower.includes('saman') || lower.includes('pipe') || lower.includes('wire')) {
          reply = `Yes, I have all the required tools and replacement parts with me. Don't worry, we'll get it fixed perfectly.`;
        } else if (lower.includes('gate') || lower.includes('address') || lower.includes('street') || lower.includes('gali') || lower.includes('ghar') || lower.includes('home') || lower.includes('location')) {
          reply = `Ji, I have your address and location on my map. I will call you as soon as I arrive at your gate.`;
        } else {
          const providerResponses = [
            "Assalam-o-Alaikum! Yes, I am heading to your location now.",
            "Understood, ji. I will be there shortly.",
            "Ji, don't worry. I will make sure the work is done perfectly.",
            "Almost there! Just a couple of minutes away.",
            "I'm riding my bike right now, will reach you very soon."
          ];
          reply = providerResponses[Math.floor(Math.random() * providerResponses.length)];
        }
      } else {
        // ── Real /chat API call ──────────────────────────────────────────
        const request: import('../services/apiService').ChatRequest = {
          message: text,
          user_id: userId ?? null,
          session_id: sessionIdRef.current,
        };

        if (customLocation) {
          request.latitude = customLocation.latitude;
          request.longitude = customLocation.longitude;
          request.location_name = customLocation.location_name;
        } else if (userLocation) {
          request.latitude = userLocation.latitude;
          request.longitude = userLocation.longitude;
          request.location_name = (locationName && locationName !== "Finding location..." && locationName !== "Location denied" && locationName !== "Location error") ? locationName : "Unknown Location";
        }

        if (selection) {
          request.selected_provider_id = selection.provider_id;
          request.selected_slot = selection.slot;
          request.selected_date = selection.date;
        }

        console.log('📤 Sending to /chat/v2:', JSON.stringify(request));
        const response = await chat(request);
        console.log('📥 /chat/v2 response:', JSON.stringify(response));

        if (response.session_id) {
          sessionIdRef.current = response.session_id;
        }

        setLastChatResponse(response);
        reply = response.reply;
        selectable = !!(response.providers && response.providers.length > 0);
        providers = response.providers;
        isCompleted = response.phase === 'completed';
        requireLocation = !!response.requires_location;

        if (isCompleted) {
          const service = response.state?.service_type || 'Selected Service';
          scheduleHeadsUpNotification(
            'Booking Confirmed!',
            response.reply,
            { service }
          );
        }

        if (response.phase === 'confirming_booking' && response.booking_summary) {
          proposal = {
            service: response.state?.service_type || 'Selected Service',
            provider: response.booking_summary.provider_name,
            time: `${response.booking_summary.date} at ${response.booking_summary.slot}`,
            price: `Rs. ${response.booking_summary.hourly_rate}/hr`,
            provider_id: response.booking_summary.provider_id
          };
        }
      }

      const aiMsg: Message = { 
        id: `a${Date.now()}`, 
        role: 'assistant', 
        text: reply, 
        timestamp: new Date(),
        selectable,
        providers,
        bookingProposal: proposal,
        proposalStatus: proposal ? 'pending' : undefined,
        isCompleted,
        requireLocation
      };
      setMessages(prev => [...prev, aiMsg]);
      if (proposal) setBookingProposal(proposal);
    } catch (err) {
      console.error('❌ /chat error:', err);
      const errMsg: Message = { id: `e${Date.now()}`, role: 'assistant', text: "Sorry, I couldn't connect. Please try again.", timestamp: new Date() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }

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
        setInputText(text);
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

  function handleSend() {
    const text = inputText.trim();
    if (!text || isTyping) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text, timestamp: new Date() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputText('');
    fetchReply(text, updatedHistory);
  }

  function handleDeclineBooking(msgId: string) {
    setBookingProposal(null);
    const text = "Changes needed in booking details.";
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text, timestamp: new Date() };
    const updatedHistory = [...messages.map(m => m.id === msgId ? { ...m, proposalStatus: 'declined' as const } : m), userMsg];
    setMessages(updatedHistory);
    fetchReply(text, updatedHistory);
  }

  function handleConfirmBooking(msgId: string, proposal: BookingProposal) {
    setBookingProposal(null);
    const text = "Booking details look fine, kindly book it.";
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text, timestamp: new Date() };
    const updatedHistory = [...messages.map(m => m.id === msgId ? { ...m, proposalStatus: 'confirmed' as const } : m), userMsg];
    setMessages(updatedHistory);
    fetchReply(text, updatedHistory);
  }

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }, { translateY: keyboardAnim }], paddingBottom: insets.bottom }]}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.aiAvatar, providerMode && { backgroundColor: '#005c3e' }]}>
                <MaterialIcons name={providerMode ? "person" : "smart-toy"} size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{providerMode ? providerName : "Karigar Assistant"}</Text>
                <Text style={styles.headerSub}>{providerMode ? "Service Provider (Active)" : "Powered by AI"}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (providerMode) {
                  onClose();
                } else {
                  setShowCloseConfirm(true);
                }
              }} 
              style={styles.closeBtn}
            >
              <MaterialIcons name="close" size={22} color="#3e4949" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Greeting chip */}
            <View style={styles.systemChip}>
              <Text style={styles.systemChipText}>Chat started · {formatTime(new Date())}</Text>
            </View>

            {isLoadingHistory && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#00595c" />
                <Text style={{ marginTop: 8, color: '#6e7979', fontSize: 13, fontFamily: 'Inter_500Medium' }}>Loading history...</Text>
              </View>
            )}

            {messages.map((msg, index) => {
              const isOldMessage = index < messages.length - 1;
              return (
                <React.Fragment key={`fragment-${msg.id}`}>
                  <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  {msg.role === 'assistant' && (
                    <View style={[styles.aiBubbleAvatar, providerMode && { backgroundColor: '#e6f4fe', borderColor: '#b3dbf8' }]}>
                      <MaterialIcons name={providerMode ? "person" : "smart-toy"} size={14} color={providerMode ? "#004B87" : "#00595c"} />
                    </View>
                  )}
                  <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent]}>
                    {msg.audioUri ? (
                      <VoiceMessagePlayer uri={msg.audioUri} isUser={msg.role === 'user'} />
                    ) : (
                      <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                        {msg.text}
                      </Text>
                    )}
                    {msg.isCompleted && (
                      <TouchableOpacity 
                        style={{ marginTop: 12, backgroundColor: '#00595c', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' }}
                        onPress={() => setShowNavigateConfirm(true)}
                      >
                        <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>View Bookings</Text>
                      </TouchableOpacity>
                    )}
                    {msg.requireLocation && (
                      <TouchableOpacity 
                        style={[
                          styles.locationBtn,
                          isOldMessage && styles.disabledLocationBtn
                        ]}
                        disabled={isOldMessage}
                        onPress={openMapPicker}
                      >
                        <MaterialIcons name="map" size={16} color={isOldMessage ? "#6e7979" : "#fff"} />
                        <Text style={[
                          styles.locationBtnText,
                          isOldMessage && styles.disabledLocationBtnText
                        ]}>
                          Choose Location from Map
                        </Text>
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.bubbleTime, msg.role === 'user' ? styles.userBubbleTime : styles.aiBubbleTime]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                </View>

                {msg.selectable && msg.providers && msg.providers.length > 0 && (
                  <View style={styles.providersContainer}>
                    <Text style={styles.providersHeader}>Available Providers</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={{ marginHorizontal: -16 }}
                      contentContainerStyle={styles.providersScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {msg.providers.map(p => (
                        <View key={p.id} style={[styles.providerCard, p.smart_match?.is_top_pick && styles.providerCardTopPick]}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              router.push({
                                pathname: '/provider-profile',
                                params: {
                                  id: p.id.toString(),
                                  name: p.name,
                                  service: p.service_type || 'Specialist',
                                  price: p.hourly_rate ? `Rs ${p.hourly_rate} Base Fee` : 'Rs 1,200 Base Fee',
                                  smart_match: p.smart_match ? JSON.stringify(p.smart_match) : undefined
                                }
                              });
                            }}
                          >
                            {p.smart_match?.is_top_pick && (
                              <View style={styles.topPickBadgeInCard}>
                                <MaterialIcons name="auto-awesome" size={10} color="#92400e" />
                                <Text style={styles.topPickBadgeTextInCard}>AI TOP PICK</Text>
                              </View>
                            )}
                            <View style={styles.providerCardHeader}>
                              <Image 
                                source={(p.name.includes("Ali") || p.id === 37)
                                  ? require('../../assets/images/ali_profile.png')
                                  : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=00595c&color=fff&size=100` }
                                }
                                style={styles.providerAvatarInCard}
                              />
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={styles.providerName} numberOfLines={1}>{p.name}</Text>
                                  <View style={styles.providerRating}>
                                    <MaterialIcons name="star" size={12} color="#f59e0b" />
                                    <Text style={styles.providerRatingText}>{p.rating}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            <View style={{ marginBottom: 6 }}>
                              <Text style={[styles.providerLocation, { marginBottom: 0 }]}>
                                <MaterialIcons name="location-on" size={12} color="#6e7979" /> {p.location} ({p.distance_km} km)
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
                              {p.smart_match ? (
                                <TouchableOpacity 
                                  style={styles.whyHimButton} 
                                  onPress={() => handleWhyHimPress(p)}
                                  activeOpacity={0.7}
                                >
                                  <MaterialIcons name="auto-awesome" size={10} color="#92400e" />
                                  <Text style={styles.whyHimText}>Why him?</Text>
                                </TouchableOpacity>
                              ) : <View />}

                              {p.hourly_rate !== undefined && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <MaterialIcons name="payments" size={14} color="#00595c" style={{ marginRight: 4 }} />
                                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#00595c' }}>
                                    Rs. {p.hourly_rate}/hr
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                          <Text style={styles.providerSlotsTitle}>Available Slots:</Text>
                          <View style={styles.slotsContainer}>
                            {(Array.isArray(p.available_slots)
                              ? p.available_slots
                              : Object.values(p.available_slots).flat()
                            ).map((slot: string) => (
                              <TouchableOpacity 
                                key={slot} 
                                style={[styles.slotBtn, isOldMessage && styles.disabledSlotBtn]}
                                disabled={isOldMessage}
                                onPress={() => {
                                  const selectionText = `I want to book ${p.name} at ${slot}`;
                                  const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text: selectionText, timestamp: new Date() };
                                  const updatedHistory = [...messages, userMsg];
                                  setMessages(updatedHistory);
                                  fetchReply(selectionText, updatedHistory, { provider_id: p.id, slot, date: p.booking_date || new Date().toISOString().split('T')[0] });
                                }}
                              >
                                <Text style={[styles.slotBtnText, isOldMessage && styles.disabledSlotBtnText]}>{slot}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {msg.bookingProposal && msg.proposalStatus === 'pending' && (
                  <View style={styles.bookingCard}>
                    <View style={styles.bookingCardHeader}>
                      <MaterialIcons name="event-available" size={20} color="#00595c" />
                      <Text style={styles.bookingCardTitle}>Booking Proposal</Text>
                    </View>
                    <View style={styles.bookingRow}>
                      <Text style={styles.bookingLabel}>Service</Text>
                      <Text style={styles.bookingValue}>{msg.bookingProposal.service}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.bookingRow}
                      onPress={() => {
                        const matchingProvider = msg.providers?.find(p => p.id === msg.bookingProposal!.provider_id);
                        router.push({
                          pathname: '/provider-profile',
                          params: {
                            id: msg.bookingProposal!.provider_id?.toString() || 'unknown',
                            name: msg.bookingProposal!.provider,
                            service: msg.bookingProposal!.service,
                            price: msg.bookingProposal!.price,
                            smart_match: matchingProvider?.smart_match ? JSON.stringify(matchingProvider.smart_match) : undefined
                          }
                        });
                      }}
                    >
                      <Text style={styles.bookingLabel}>Provider</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={[styles.bookingValue, { color: '#00595c', textDecorationLine: 'underline', fontFamily: 'Inter_600SemiBold' }]}>
                          {msg.bookingProposal.provider}
                        </Text>
                        <MaterialIcons name="chevron-right" size={16} color="#00595c" />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.bookingRow}>
                      <Text style={styles.bookingLabel}>Time</Text>
                      <Text style={styles.bookingValue}>{msg.bookingProposal.time}</Text>
                    </View>
                    <View style={[styles.bookingRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.bookingLabel}>Estimated Cost</Text>
                      <Text style={[styles.bookingValue, { color: '#00595c', fontFamily: 'PlusJakartaSans_600SemiBold' }]}>{msg.bookingProposal.price}</Text>
                    </View>
                    <View style={styles.bookingActions}>
                      <TouchableOpacity 
                        style={[styles.rejectBtn, isOldMessage && styles.disabledRejectBtn]} 
                        disabled={isOldMessage}
                        onPress={() => handleDeclineBooking(msg.id)}
                      >
                        <Text style={[styles.rejectBtnText, isOldMessage && styles.disabledRejectBtnText]}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.confirmBtn, isOldMessage && styles.disabledConfirmBtn]} 
                        disabled={isOldMessage}
                        onPress={() => handleConfirmBooking(msg.id, msg.bookingProposal!)}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" style={isOldMessage && { opacity: 0.5 }} />
                        <Text style={[styles.confirmBtnText, isOldMessage && styles.disabledConfirmBtnText]}>Confirm Booking</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                </React.Fragment>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <View style={[styles.bubble, styles.aiBubble]}>
                <View style={[styles.aiBubbleAvatar, providerMode && { backgroundColor: '#e6f4fe', borderColor: '#b3dbf8' }]}>
                  <MaterialIcons name={providerMode ? "person" : "smart-toy"} size={14} color={providerMode ? "#004B87" : "#00595c"} />
                </View>
                <View style={[styles.typingIndicator, providerMode && { backgroundColor: '#f0f7fc' }]}>
                  <ActivityIndicator size="small" color={providerMode ? "#004B87" : "#00595c"} />
                  <Text style={[styles.typingText, providerMode && { color: '#004B87' }]}>
                    {providerMode ? `${providerName} is typing...` : "Karigar AI is thinking..."}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {isRecording ? (
                <View style={styles.recordingRow}>
                  <TouchableOpacity onPress={cancelRecording} style={styles.voiceActionBtn}>
                    <MaterialIcons name="close" size={24} color="#ba1a1a" />
                  </TouchableOpacity>
                  
                  <View style={styles.voicePulseWrapper}>
                    <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                      <MaterialIcons name="mic" size={28} color="#00595c" />
                    </Animated.View>
                    <Text style={styles.listeningText}>Listening...</Text>
                  </View>

                  {/* Symmetrical spacer to keep the mic perfectly centered */}
                  <View style={{ width: 48 }} />
                </View>
              ) : isTranscribing ? (
                <View style={styles.recordingRow}>
                  <View style={styles.voicePulseWrapper}>
                    <ActivityIndicator size="small" color="#00595c" />
                    <Text style={styles.listeningText}>Transcribing voice to text...</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type your reply..."
                    placeholderTextColor="#6e7979"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    onSubmitEditing={handleSend}
                  />
                  {inputText.trim().length > 0 ? (
                    <TouchableOpacity
                      style={[styles.chatSendBtn, isTyping && styles.chatSendBtnDisabled]}
                      onPress={handleSend}
                      disabled={isTyping}
                    >
                      <MaterialIcons name="arrow-upward" size={20} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.chatMicBtn}
                      onPress={startSpeechRecognition}
                      disabled={isTyping}
                    >
                      <MaterialIcons name="mic" size={24} color="#00595c" />
                    </TouchableOpacity>
                  )}
                </View>
            )}
          </KeyboardAvoidingView>

          {/* View Bookings Confirmation Overlay */}
          {showNavigateConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <MaterialIcons name="event-note" size={32} color="#00595c" style={{ marginBottom: 12 }} />
                <Text style={styles.confirmTitle}>View Bookings?</Text>
                <Text style={styles.confirmBody}>This will end your current chat session. Are you sure you want to navigate to your bookings?</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmKeepBtn} onPress={() => setShowNavigateConfirm(false)}>
                    <Text style={styles.confirmKeepText}>Stay in Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmLeaveBtn} onPress={() => {
                    setShowNavigateConfirm(false);
                    onClose();
                    if (onNavigateToBookings) {
                      onNavigateToBookings();
                    }
                  }}>
                    <Text style={styles.confirmLeaveText}>Yes, Go to Bookings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Close Confirmation Overlay */}
          {showCloseConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <MaterialIcons name="chat-bubble-outline" size={32} color="#00595c" style={{ marginBottom: 12 }} />
                <Text style={styles.confirmTitle}>End this chat?</Text>
                <Text style={styles.confirmBody}>Your conversation will be lost. Are you sure you want to leave?</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmKeepBtn} onPress={() => setShowCloseConfirm(false)}>
                    <Text style={styles.confirmKeepText}>Keep Chatting</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmLeaveBtn} onPress={onClose}>
                    <Text style={styles.confirmLeaveText}>Yes, End Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Why Him Smart Match Modal Overlay */}
          {whyHimModalVisible && selectedWhyHimProvider && (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, { width: '90%', maxHeight: '80%' }]}>
                <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="auto-awesome" size={20} color="#92400e" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#1a1a2e' }}>Antigravity AI Match Analysis</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setWhyHimModalVisible(false); setSelectedWhyHimProvider(null); }} style={{ padding: 4 }}>
                    <MaterialIcons name="close" size={22} color="#6e7979" />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#00595c', alignSelf: 'flex-start', marginBottom: 4 }}>
                  {selectedWhyHimProvider.name}
                </Text>
                
                {selectedWhyHimProvider.smart_match?.headline && (
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#92400e', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 14 }}>
                    {selectedWhyHimProvider.smart_match.headline}
                  </Text>
                )}

                <ScrollView style={{ width: '100%', maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {selectedWhyHimProvider.smart_match?.match_reasons?.map((reason: any, idx: number) => {
                    let iconName: any = 'done';
                    if (reason.factor === 'proximity') iconName = 'location-on';
                    else if (reason.factor === 'price') iconName = 'payments';
                    else if (reason.factor === 'rating') iconName = 'star';

                    return (
                      <View key={idx} style={{ flexDirection: 'row', gap: 12, marginBottom: 16, backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name={iconName} size={16} color="#00595c" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#1a1a2e', marginBottom: 2 }}>{reason.title}</Text>
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6e7979', lineHeight: 16 }}>{reason.description}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity 
                  style={{ width: '100%', height: 48, borderRadius: 12, backgroundColor: '#00595c', alignItems: 'center', justifyContent: 'center', marginTop: 14 }} 
                  onPress={() => { setWhyHimModalVisible(false); setSelectedWhyHimProvider(null); }}
                >
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#fff' }}>Ok</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Interactive Map Picker Modal */}
          <Modal
            visible={mapPickerVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setMapPickerVisible(false)}
          >
            <View style={styles.mapPickerContainer}>
              {/* Map View */}
              <MapView
                ref={mapPickerRef}
                style={styles.pickerMap}
                initialRegion={pickerRegion}
                onRegionChangeComplete={(region) => {
                  setMarkerCoord({
                    latitude: region.latitude,
                    longitude: region.longitude
                  });
                }}
              />

              {/* Center Pin Indicator */}
              <View style={styles.centerPinContainer} pointerEvents="none">
                <View style={styles.pinBubble}>
                  <Text style={styles.pinBubbleText}>Set your location here</Text>
                </View>
                <MaterialIcons name="location-on" size={40} color="#ba1a1a" />
                <View style={styles.pinShadow} />
              </View>

              {/* Header Overlay */}
              <View style={[styles.mapHeader, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity 
                  style={styles.mapBackButton} 
                  onPress={() => setMapPickerVisible(false)}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#1a1a2e" />
                </TouchableOpacity>
                <Text style={styles.mapHeaderTitle}>Select Location</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Floating GPS Button */}
              <TouchableOpacity 
                style={[styles.gpsButton, { bottom: insets.bottom + 160 }]} 
                onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                      const loc = await Location.getCurrentPositionAsync({});
                      mapPickerRef.current?.animateToRegion({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015
                      }, 600);
                    }
                  } catch (e) {
                    console.warn("Failed to get current position:", e);
                  }
                }}
              >
                <MaterialIcons name="gps-fixed" size={24} color="#00595c" />
              </TouchableOpacity>

              {/* Bottom Control Panel */}
              <View style={[styles.mapBottomPanel, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.locationInfoRow}>
                  <View style={styles.locationIconCircle}>
                    <MaterialIcons name="my-location" size={20} color="#00595c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationInfoLabel}>Selected Coordinate</Text>
                    <Text style={styles.locationInfoValue} numberOfLines={1}>
                      {markerCoord.latitude.toFixed(6)}, {markerCoord.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>

                <View style={styles.mapActions}>
                  <TouchableOpacity 
                    style={styles.mapCancelBtn} 
                    onPress={() => setMapPickerVisible(false)}
                  >
                    <Text style={styles.mapCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.mapConfirmBtn} 
                    onPress={handleChooseLocation}
                  >
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.mapConfirmBtnText}>Choose</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#d0d7d7', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f2f2' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00595c', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#1a1a2e' },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6e7979' },
  closeBtn: { padding: 8 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  systemChip: { alignSelf: 'center', backgroundColor: '#f0f2f2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 },
  systemChipText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6e7979' },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiBubbleAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8fff5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#b3e8d8', flexShrink: 0 },
  bubbleContent: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  userBubbleContent: { backgroundColor: '#00595c', borderBottomRightRadius: 4 },
  aiBubbleContent: { backgroundColor: '#f5f7f7', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  userBubbleText: { color: '#fff' },
  aiBubbleText: { color: '#1a1a2e' },
  bubbleTime: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  userBubbleTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiBubbleTime: { color: '#9eabab' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f7f7', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12 },
  typingText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6e7979' },
  bookingCard: { backgroundColor: '#f0fdfa', borderRadius: 16, borderWidth: 1.5, borderColor: '#b3e8d8', padding: 16, marginTop: 4 },
  bookingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bookingCardTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#00595c' },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d4f5eb' },
  bookingLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6e7979' },
  bookingValue: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#1a1a2e', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  bookingActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#bec9c9', alignItems: 'center' },
  rejectBtnText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3e4949' },
  confirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: '#00595c', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  confirmBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#f0f2f2' },
  chatInput: { flex: 1, backgroundColor: '#f5f7f7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1a1a2e', maxHeight: 100 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00595c', alignItems: 'center', justifyContent: 'center' },
  chatSendBtnDisabled: { backgroundColor: '#bec9c9' },
  doneBtn: { margin: 16, backgroundColor: '#00595c', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#fff' },
  confirmOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 99,
  },
  confirmCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    marginHorizontal: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  confirmTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: '#1a1a2e', marginBottom: 8, textAlign: 'center' },
  confirmBody: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6e7979', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmKeepBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#00595c', alignItems: 'center' },
  confirmKeepText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#fff' },
  confirmLeaveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#bec9c9', alignItems: 'center' },
  confirmLeaveText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#ba1a1a' },
  chatMicBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8fff5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#b3e8d8' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f2f2', backgroundColor: '#f0fdfa' },
  voiceActionBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  voicePulseWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  pulseCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0, 89, 92, 0.15)', alignItems: 'center', justifyContent: 'center' },
  listeningText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#00595c' },
  voicePlayer: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160, paddingVertical: 4 },
  playBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userPlayBtn: { backgroundColor: '#fff' },
  aiPlayBtn: { backgroundColor: '#00595c' },
  waveformContainer: { flex: 1, height: 4, borderRadius: 2, position: 'relative', overflow: 'hidden' },
  waveformProgress: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 2 },
  userWaveformBg: { backgroundColor: 'rgba(255,255,255,0.25)' },
  aiWaveformBg: { backgroundColor: 'rgba(0, 89, 92, 0.15)' },
  userWaveform: { backgroundColor: '#fff' },
  aiWaveform: { backgroundColor: '#00595c' },
  audioDuration: { fontFamily: 'Inter_400Regular', fontSize: 10, minWidth: 28 },
  providersContainer: { marginTop: 12, marginBottom: 8 },
  providersHeader: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#00595c', marginLeft: 4, marginBottom: 8 },
  providersScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  providerCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, width: 240, borderWidth: 1, borderColor: '#d0d7d7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  providerCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  providerName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#1a1a2e', flex: 1, marginRight: 8 },
  providerRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbec', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  providerRatingText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#b45309', marginLeft: 2 },
  providerLocation: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6e7979', marginBottom: 12 },
  providerSlotsTitle: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#3e4949', marginBottom: 8 },
  slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slotBtn: { backgroundColor: '#f0fdfa', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#b3e8d8' },
  slotBtnText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#00595c' },
  disabledSlotBtn: { backgroundColor: '#f0f2f2', borderColor: '#d0d7d7', opacity: 0.6 },
  disabledSlotBtnText: { color: '#6e7979' },
  disabledRejectBtn: { borderColor: '#d0d7d7', opacity: 0.5 },
  disabledRejectBtnText: { color: '#9eabab' },
  disabledConfirmBtn: { backgroundColor: '#bec9c9', opacity: 0.6 },
  disabledConfirmBtnText: { color: '#fff' },
  providerCardTopPick: { borderColor: '#fbbf24', borderWidth: 1, backgroundColor: '#fffbeb' },
  topPickBadgeInCard: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fcd34d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  topPickBadgeTextInCard: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 8, color: '#92400e' },
  providerAvatarInCard: { width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  whyHimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  whyHimText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: '#92400e',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00595c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledLocationBtn: {
    backgroundColor: '#f0f2f2',
    borderWidth: 1.5,
    borderColor: '#bec9c9',
    shadowOpacity: 0,
    elevation: 0,
  },
  locationBtnText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
  },
  disabledLocationBtnText: {
    color: '#6e7979',
  },
  mapPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  pickerMap: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinBubble: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pinBubbleText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  pinShadow: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -2,
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f2',
    zIndex: 10,
  },
  mapBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHeaderTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
  },
  gpsButton: {
    position: 'absolute',
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  mapBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    backgroundColor: '#f5f7f7',
    padding: 12,
    borderRadius: 12,
  },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8fff5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b3e8d8',
  },
  locationInfoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6e7979',
    marginBottom: 2,
  },
  locationInfoValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  mapActions: {
    flexDirection: 'row',
    gap: 12,
  },
  mapCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bec9c9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCancelBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#3e4949',
  },
  mapConfirmBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00595c',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mapConfirmBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
