import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
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
  providerName?: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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
export default function ChatBottomSheet({ visible, initialQuery, onClose, userName, userId, providerMode = false, providerName = "Ahmed Khan", messages, setMessages }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingProposal, setBookingProposal] = useState<BookingProposal | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // Real API response state
  const [lastChatResponse, setLastChatResponse] = useState<ChatResponse | null>(null);
  
  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const isCancelledRef = useRef(false);
  const activeSessionRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);

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
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
      // Reset state when closed, keeping messages preserved
      setInputText('');
      setBookingProposal(null);
      setBookingConfirmed(false);
      setIsTyping(false);
      setShowCloseConfirm(false);
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

  async function fetchReply(text: string, currentHistory: Message[], selection?: { provider_id: number; slot: string; date: string }) {
    setIsTyping(true);
    try {
      let reply = "";
      let proposal = null;
      let selectable = false;
      let providers = null;

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

        if (response.phase === 'confirming_booking' && response.booking_summary) {
          proposal = {
            service: response.state?.service_type || 'Selected Service',
            provider: response.booking_summary.provider_name,
            time: `${response.booking_summary.date} at ${response.booking_summary.slot}`,
            price: `Rs. ${response.booking_summary.hourly_rate}/hr`,
            provider_id: response.booking_summary.provider_id
          };
        }
        // is_complete available on response for future use
      }

      const aiMsg: Message = { 
        id: `a${Date.now()}`, 
        role: 'assistant', 
        text: reply, 
        timestamp: new Date(),
        selectable,
        providers,
        bookingProposal: proposal,
        proposalStatus: proposal ? 'pending' : undefined
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
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'declined' } : m));
    setBookingProposal(null);
  }

  function handleConfirmBooking(msgId: string, proposal: BookingProposal) {
    setBookingConfirmed(true);
    const confirmMsg: Message = {
      id: `u${Date.now()}`,
      role: 'user',
      text: '✅ Confirmed! Please proceed.',
      timestamp: new Date(),
    };
    const aiConfirmMsg: Message = {
      id: `a${Date.now()}`,
      role: 'assistant',
      text: `🎉 Your booking is confirmed! ${proposal.provider} will arrive at ${proposal.time}. You'll receive a notification 30 mins before arrival.`,
      timestamp: new Date(),
    };
    setMessages(prev => {
      const updated = prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'confirmed' } : m);
      return [...updated, confirmMsg, aiConfirmMsg];
    });
    setBookingProposal(null);
    
    // Trigger local heads-up notification
    scheduleHeadsUpNotification(
      'Booking Confirmed!',
      `${proposal.provider} is scheduled to arrive at ${proposal.time}.`,
      { service: proposal.service }
    );
  }

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
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
          >
            {/* Greeting chip */}
            <View style={styles.systemChip}>
              <Text style={styles.systemChipText}>Chat started · {formatTime(new Date())}</Text>
            </View>

            {messages.map(msg => (
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
                    <Text style={[styles.bubbleTime, msg.role === 'user' ? styles.userBubbleTime : styles.aiBubbleTime]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                </View>

                {msg.selectable && msg.providers && msg.providers.length > 0 && (
                  <View style={styles.providersContainer}>
                    <Text style={styles.providersHeader}>Available Providers</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersScroll}>
                      {msg.providers.map(p => (
                        <View key={p.id} style={styles.providerCard}>
                          <View style={styles.providerCardHeader}>
                            <Text style={styles.providerName} numberOfLines={1}>{p.name}</Text>
                            <View style={styles.providerRating}>
                              <MaterialIcons name="star" size={14} color="#f59e0b" />
                              <Text style={styles.providerRatingText}>{p.rating}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={[styles.providerLocation, { marginBottom: 0 }]}>
                              <MaterialIcons name="location-on" size={12} color="#6e7979" /> {p.location} ({p.distance_km} km)
                            </Text>
                            {p.hourly_rate !== undefined && (
                              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#00595c' }}>
                                Rs. {p.hourly_rate}/hr
                              </Text>
                            )}
                          </View>
                          <Text style={styles.providerSlotsTitle}>Available Slots:</Text>
                          <View style={styles.slotsContainer}>
                            {p.available_slots.map(slot => (
                              <TouchableOpacity 
                                key={slot} 
                                style={styles.slotBtn}
                                onPress={() => {
                                  const selectionText = `I want to book ${p.name} at ${slot}`;
                                  const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text: selectionText, timestamp: new Date() };
                                  const updatedHistory = [...messages, userMsg];
                                  setMessages(updatedHistory);
                                  fetchReply(selectionText, updatedHistory, { provider_id: p.id, slot, date: p.booking_date || new Date().toISOString().split('T')[0] });
                                }}
                              >
                                <Text style={styles.slotBtnText}>{slot}</Text>
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
                        onClose();
                        router.push({
                          pathname: '/provider-profile',
                          params: {
                            id: msg.bookingProposal!.provider_id?.toString() || 'unknown',
                            name: msg.bookingProposal!.provider,
                            service: msg.bookingProposal!.service,
                            price: msg.bookingProposal!.price
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
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDeclineBooking(msg.id)}>
                        <Text style={styles.rejectBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmBooking(msg.id, msg.bookingProposal!)}>
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </React.Fragment>
            ))}

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
          {!bookingConfirmed && (
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
          )}

          {/* Post-confirmation CTA */}
          {bookingConfirmed && (
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done — View My Bookings</Text>
            </TouchableOpacity>
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
  providersScroll: { paddingHorizontal: 4, paddingBottom: 8, gap: 12 },
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
});
