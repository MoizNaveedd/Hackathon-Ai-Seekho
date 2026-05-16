import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface BookingProposal {
  service: string;
  provider: string;
  time: string;
  price: string;
}

interface Props {
  visible: boolean;
  initialQuery: string;
  onClose: () => void;
  userName: string;
}

// ─── Mock Backend ─────────────────────────────────────────────────────────────
// Replace the body of this function with a real fetch() call to your API.
// Expected API contract:
//   POST /api/chat
//   Body: { query: string, history: Message[] }
//   Response: { reply: string, bookingProposal?: BookingProposal }
async function sendToBackend(
  query: string,
  history: Message[]
): Promise<{ reply: string; bookingProposal?: BookingProposal }> {
  // --- MOCK: swap this block with your real API call ---
  await new Promise(r => setTimeout(r, 1200)); // simulate network latency

  const lower = query.toLowerCase();
  const turnCount = history.filter(m => m.role === 'user').length;

  if (turnCount === 0) {
    // First message — understand the problem
    if (lower.includes('ac') || lower.includes('air'))
      return { reply: "Got it! I can see you're having AC trouble. Is the issue that it's not cooling, or is it making a noise as well?" };
    if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('leak'))
      return { reply: "Understood. For plumbing issues, can you tell me the exact location — is it a leaking pipe, a blocked drain, or something else?" };
    return { reply: `I understand you need help with: "${query}". Can you give me a bit more detail so I can match you with the right karigar?` };
  }

  if (turnCount === 1)
    return { reply: "Perfect. What's the best time for the karigar to visit? Morning (9AM–12PM), Afternoon (1PM–5PM), or Evening (6PM–8PM)?" };

  if (turnCount === 2)
    return { reply: "Great choice! Should this be today or tomorrow?" };

  if (turnCount === 3)
    return {
      reply: "✅ I've found the perfect match for you! Here's your booking proposal:",
      bookingProposal: {
        service: history[0]?.text || 'Home Service',
        provider: 'Usman AC Repairs ⭐ 4.8',
        time: history[history.length - 1]?.text?.toLowerCase().includes('morning') ? 'Today, 10:00 AM' : 'Today, 3:00 PM',
        price: 'Rs 850 – Rs 1,200',
      },
    };

  return { reply: "Is there anything else you'd like to adjust before confirming?" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatBottomSheet({ visible, initialQuery, onClose, userName }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingProposal, setBookingProposal] = useState<BookingProposal | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Slide up when visible
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      if (initialQuery) {
        // Seed the first user message and get AI reply
        const firstMsg: Message = { id: 'u0', role: 'user', text: initialQuery, timestamp: new Date() };
        setMessages([firstMsg]);
        fetchReply(initialQuery, [firstMsg]);
      }
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
      // Reset state when closed
      setMessages([]);
      setInputText('');
      setBookingProposal(null);
      setBookingConfirmed(false);
      setIsTyping(false);
      setShowCloseConfirm(false);
    }
  }, [visible]);

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

  async function fetchReply(text: string, currentHistory: Message[]) {
    setIsTyping(true);
    try {
      const { reply, bookingProposal: proposal } = await sendToBackend(text, currentHistory);
      const aiMsg: Message = { id: `a${Date.now()}`, role: 'assistant', text: reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      if (proposal) setBookingProposal(proposal);
    } catch {
      const errMsg: Message = { id: `e${Date.now()}`, role: 'assistant', text: "Sorry, I couldn't connect to the server. Please try again.", timestamp: new Date() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
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

  function handleConfirmBooking() {
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
      text: `🎉 Your booking is confirmed! ${bookingProposal?.provider} will arrive at ${bookingProposal?.time}. You'll receive a notification 30 mins before arrival.`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg, aiConfirmMsg]);
    setBookingProposal(null);
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
              <View style={styles.aiAvatar}>
                <MaterialIcons name="smart-toy" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Karigar Assistant</Text>
                <Text style={styles.headerSub}>Powered by AI</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowCloseConfirm(true)} style={styles.closeBtn}>
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
              <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                {msg.role === 'assistant' && (
                  <View style={styles.aiBubbleAvatar}>
                    <MaterialIcons name="smart-toy" size={14} color="#00595c" />
                  </View>
                )}
                <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.bubbleTime, msg.role === 'user' ? styles.userBubbleTime : styles.aiBubbleTime]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <View style={[styles.bubble, styles.aiBubble]}>
                <View style={styles.aiBubbleAvatar}>
                  <MaterialIcons name="smart-toy" size={14} color="#00595c" />
                </View>
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color="#00595c" />
                  <Text style={styles.typingText}>Karigar AI is thinking...</Text>
                </View>
              </View>
            )}

            {/* Booking Proposal Card */}
            {bookingProposal && !bookingConfirmed && (
              <View style={styles.bookingCard}>
                <View style={styles.bookingCardHeader}>
                  <MaterialIcons name="event-available" size={20} color="#00595c" />
                  <Text style={styles.bookingCardTitle}>Booking Proposal</Text>
                </View>
                <View style={styles.bookingRow}>
                  <Text style={styles.bookingLabel}>Service</Text>
                  <Text style={styles.bookingValue}>{bookingProposal.service}</Text>
                </View>
                <View style={styles.bookingRow}>
                  <Text style={styles.bookingLabel}>Provider</Text>
                  <Text style={styles.bookingValue}>{bookingProposal.provider}</Text>
                </View>
                <View style={styles.bookingRow}>
                  <Text style={styles.bookingLabel}>Time</Text>
                  <Text style={styles.bookingValue}>{bookingProposal.time}</Text>
                </View>
                <View style={[styles.bookingRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.bookingLabel}>Estimated Cost</Text>
                  <Text style={[styles.bookingValue, { color: '#00595c', fontFamily: 'PlusJakartaSans_600SemiBold' }]}>{bookingProposal.price}</Text>
                </View>
                <View style={styles.bookingActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => setBookingProposal(null)}>
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking}>
                    <MaterialIcons name="check" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          {!bookingConfirmed && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                <TouchableOpacity
                  style={[styles.chatSendBtn, (!inputText.trim() || isTyping) && styles.chatSendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isTyping}
                >
                  <MaterialIcons name="arrow-upward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
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
    maxHeight: '88%',
    minHeight: '60%',
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
});
