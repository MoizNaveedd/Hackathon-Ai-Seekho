import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Modal,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Mock reviews data specifically for Ali
const MOCK_REVIEWS = [
  {
    id: 'r1',
    userName: 'Saad Mansoor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    date: 'Yesterday',
    comment: 'Very professional. He arrived on time and fixed the gas leakage in my inverter AC which two other mechanics couldn\'t solve. Highly recommended!',
    verified: true,
  },
  {
    id: 'r2',
    userName: 'Fatima Khan',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    date: '3 days ago',
    comment: 'Ali was very thorough and cleaned up the workspace after finishing. Great service quality and highly professional behavior.',
    verified: true,
  },
  {
    id: 'r3',
    userName: 'Zainab Jamil',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    rating: 4.8,
    date: '1 week ago',
    comment: 'Great expertise. Explained the inverter issue in detail before replacing the capacitor. Fair pricing.',
    verified: true,
  }
];

export default function ProviderProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Dynamic values or defaults for Ali AC Services
  const providerId = params.id || 'ali';
  const providerName = params.name || 'Ali AC Services';
  const providerService = params.service || 'Inverter & Central Cooling Specialist';
  const providerPrice = params.price || 'Rs 1,500 Base Fee';

  const [activeSubTab, setActiveSubTab] = useState<'about' | 'reviews' | 'portfolio'>('about');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleButton = useRef(new Animated.Value(1)).current;
  const successScaleAnim = useRef(new Animated.Value(0.3)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleBookingPress = () => {
    Animated.sequence([
      Animated.timing(scaleButton, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleButton, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start(() => {
      setShowBookingModal(true);
    });
  };

  const executeBooking = () => {
    if (!selectedSlot) return;
    setIsBookingSubmitting(true);
    
    // Simulate booking delay
    setTimeout(() => {
      setIsBookingSubmitting(false);
      setBookingSuccess(true);
      
      // Animate success modal elements
      Animated.parallel([
        Animated.spring(successScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start();
    }, 1500);
  };

  const handleCallPress = () => {
    Linking.openURL('tel:+923018206192');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<MaterialIcons key={i} name="star" size={16} color="#FFB300" />);
      } else if (i - rating < 1) {
        stars.push(<MaterialIcons key={i} name="star-half" size={16} color="#FFB300" />);
      } else {
        stars.push(<MaterialIcons key={i} name="star-outline" size={16} color="#FFB300" />);
      }
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#00595c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karigar details</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleCallPress}>
          <MaterialIcons name="call" size={24} color="#00595c" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Profile Hero section */}
          <View style={styles.heroSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require('../../assets/images/ali_profile.png')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={18} color="#005c3e" />
              </View>
            </View>

            <Text style={styles.providerName}>{providerName}</Text>
            <Text style={styles.providerService}>{providerService}</Text>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <MaterialIcons name="star" size={18} color="#FFB300" />
                <Text style={styles.quickStatText}>4.8 (120 reviews)</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <MaterialIcons name="location-on" size={18} color="#00595c" />
                <Text style={styles.quickStatText}>2.4 km away</Text>
              </View>
            </View>

            <View style={styles.availabilityBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.availabilityText}>Available Today</Text>
            </View>
          </View>

          {/* Antigravity Smart Match Reason Card */}
          <View style={styles.smartMatchCard}>
            <View style={styles.smartMatchHeader}>
              <MaterialIcons name="auto-awesome" size={20} color="#005c3e" />
              <Text style={styles.smartMatchTitle}>Antigravity Smart Match</Text>
            </View>
            <Text style={styles.smartMatchIntro}>
              Ali has been matched as your top Karigar based on your specific requirements:
            </Text>

            <View style={styles.smartReasonItem}>
              <View style={styles.smartReasonIconBox}>
                <MaterialIcons name="ac-unit" size={18} color="#00595c" />
              </View>
              <View style={styles.smartReasonTextContent}>
                <Text style={styles.smartReasonItemTitle}>Inverter AC Specialist</Text>
                <Text style={styles.smartReasonItemDesc}>
                  Certified specifically for your Samsung Inverter model, with 15+ similar cooling fixes resolved this month.
                </Text>
              </View>
            </View>

            <View style={styles.smartReasonItem}>
              <View style={styles.smartReasonIconBox}>
                <MaterialIcons name="near-me" size={18} color="#00595c" />
              </View>
              <View style={styles.smartReasonTextContent}>
                <Text style={styles.smartReasonItemTitle}>Proximity Advantage</Text>
                <Text style={styles.smartReasonItemDesc}>
                  Currently located just 2.4km away from you in DHA, ensuring an arrival within 45 minutes of scheduling.
                </Text>
              </View>
            </View>

            <View style={styles.smartReasonItem}>
              <View style={styles.smartReasonIconBox}>
                <MaterialIcons name="security" size={18} color="#00595c" />
              </View>
              <View style={styles.smartReasonTextContent}>
                <Text style={styles.smartReasonItemTitle}>Elite Reliability Record</Text>
                <Text style={styles.smartReasonItemDesc}>
                  Maintains a perfect zero-cancellation streak for the last 50 bookings in your immediate neighborhood.
                </Text>
              </View>
            </View>
          </View>

          {/* Key numerical metrics section */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>12 Yrs</Text>
              <Text style={styles.metricLabel}>Experience</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>1,240+</Text>
              <Text style={styles.metricLabel}>Jobs Done</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>98%</Text>
              <Text style={styles.metricLabel}>On-Time</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>0%</Text>
              <Text style={styles.metricLabel}>Cancellation</Text>
            </View>
          </View>

          {/* Tab Selection */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeSubTab === 'about' && styles.activeTabItem]}
              onPress={() => setActiveSubTab('about')}
            >
              <Text style={[styles.tabText, activeSubTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabItem, activeSubTab === 'reviews' && styles.activeTabItem]}
              onPress={() => setActiveSubTab('reviews')}
            >
              <Text style={[styles.tabText, activeSubTab === 'reviews' && styles.activeTabText]}>Reviews (120)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabItem, activeSubTab === 'portfolio' && styles.activeTabItem]}
              onPress={() => setActiveSubTab('portfolio')}
            >
              <Text style={[styles.tabText, activeSubTab === 'portfolio' && styles.activeTabText]}>Portfolio</Text>
            </TouchableOpacity>
          </View>

          {/* Tab content wrapper */}
          <View style={styles.tabContentContainer}>
            {activeSubTab === 'about' && (
              <View style={styles.aboutTab}>
                <Text style={styles.aboutText}>
                  With over 12 years of experience in HVAC systems across Pakistan and Dubai, Ali specializes in the latest energy-efficient inverter technologies. Known for meticulous diagnostic testing, clean work practices, and transparent pricing.
                </Text>
                
                <Text style={styles.sectionHeading}>Specializations</Text>
                <View style={styles.specializationsContainer}>
                  {['Inverter AC repair', 'Gas leakage fixing', 'Deep Jet Cleaning', 'PCB Board diagnostic', 'Split AC Installation'].map((spec, index) => (
                    <View key={index} style={styles.specChip}>
                      <MaterialIcons name="done" size={14} color="#00595c" />
                      <Text style={styles.specChipText}>{spec}</Text>
                    </View>
                  ))}
                </View>

               
              </View>
            )}

            {activeSubTab === 'reviews' && (
              <View style={styles.reviewsTab}>
                {MOCK_REVIEWS.map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: rev.avatar }} style={styles.reviewAvatar} />
                      <View style={styles.reviewUserMeta}>
                        <View style={styles.reviewUserRow}>
                          <Text style={styles.reviewUserName}>{rev.userName}</Text>
                          {rev.verified && (
                            <View style={styles.verifiedReviewBadge}>
                              <MaterialIcons name="check-circle" size={12} color="#005c3e" />
                              <Text style={styles.verifiedReviewText}>Verified</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.ratingRow}>
                          <View style={styles.starsBox}>{renderStars(rev.rating)}</View>
                          <Text style={styles.reviewDate}>{rev.date}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeSubTab === 'portfolio' && (
              <View style={styles.portfolioTab}>
                <Text style={styles.portfolioHeading}>Recent Work Done</Text>
                <View style={styles.portfolioGrid}>
                  {[
                    { title: 'Inverter Board Repair', desc: 'Samsung 1.5 Ton AC', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80' },
                    { title: 'Jet Clean Service', desc: 'DHA Phase 5 Resident', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&auto=format&fit=crop&q=80' },
                    { title: 'Full Installation', desc: 'G-13 Office Complex', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop&q=80' },
                    { title: 'Compressor Swap', desc: 'Haier Inverter Series', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=80' }
                  ].map((work, idx) => (
                    <View key={idx} style={styles.portfolioCard}>
                      <Image source={{ uri: work.img }} style={styles.portfolioImg} />
                      <View style={styles.portfolioText}>
                        <Text style={styles.portfolioCardTitle}>{work.title}</Text>
                        <Text style={styles.portfolioCardDesc}>{work.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Fixed bottom action CTA bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>ESTIMATED RATE</Text>
          <Text style={styles.priceValue}>{providerPrice}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: scaleButton }], flex: 1 }}>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBookingPress} activeOpacity={0.9}>
            <MaterialIcons name="event-available" size={20} color="#fff" />
            <Text style={styles.bookBtnText}>Book Ali Now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Date & Time Scheduling Selection Modal */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isBookingSubmitting) setShowBookingModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Schedule Slot</Text>
              {!isBookingSubmitting && (
                <TouchableOpacity onPress={() => setShowBookingModal(false)} style={styles.modalCloseBtn}>
                  <MaterialIcons name="close" size={24} color="#3e4949" />
                </TouchableOpacity>
              )}
            </View>

            {/* Success state */}
            {bookingSuccess ? (
              <Animated.View style={[styles.successContent, { opacity: successOpacityAnim, transform: [{ scale: successScaleAnim }] }]}>
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <MaterialIcons name="check" size={48} color="#fff" />
                  </View>
                </View>
                <Text style={styles.successTitle}>Booking Confirmed!</Text>
                <Text style={styles.successSubtitle}>
                  Ali has been scheduled for {selectedDate === 'today' ? 'Today' : 'Tomorrow'} at {selectedSlot}.
                </Text>
                <Text style={styles.successAlertText}>
                  📞 Ali will contact you 30 minutes before arriving. A tracking notification will be sent shortly.
                </Text>

                <TouchableOpacity 
                  style={styles.successDoneBtn} 
                  onPress={() => {
                    setShowBookingModal(false);
                    setBookingSuccess(false);
                    setSelectedSlot(null);
                    // Navigate to Home or bookings tab if wanted, here we close
                    router.push({
                      pathname: '/'
                    });
                  }}
                >
                  <Text style={styles.successDoneText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              // Active Booking/Scheduling UI
              <View style={styles.bookingForm}>
                
                {/* Date Selector */}
                <Text style={styles.bookingFormLabel}>Date Choice</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity 
                    style={[styles.dateOption, selectedDate === 'today' && styles.activeDateOption]}
                    onPress={() => setSelectedDate('today')}
                  >
                    <Text style={[styles.dateOptionText, selectedDate === 'today' && styles.activeDateOptionText]}>Today</Text>
                    <Text style={[styles.dateOptionSub, selectedDate === 'today' && styles.activeDateOptionSub]}>May 17</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dateOption, selectedDate === 'tomorrow' && styles.activeDateOption]}
                    onPress={() => setSelectedDate('tomorrow')}
                  >
                    <Text style={[styles.dateOptionText, selectedDate === 'tomorrow' && styles.activeDateOptionText]}>Tomorrow</Text>
                    <Text style={[styles.dateOptionSub, selectedDate === 'tomorrow' && styles.activeDateOptionSub]}>May 18</Text>
                  </TouchableOpacity>
                </View>

                {/* Available Slots */}
                <Text style={styles.bookingFormLabel}>Available Hours (30m Travel Buffer included)</Text>
                <View style={styles.slotsGrid}>
                  {[
                    '10:00 AM - 11:30 AM',
                    '01:00 PM - 02:30 PM',
                    '03:00 PM - 04:30 PM',
                    '06:00 PM - 07:30 PM'
                  ].map((slot, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.slotItem, selectedSlot === slot && styles.activeSlotItem]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <MaterialIcons 
                        name="access-time" 
                        size={16} 
                        color={selectedSlot === slot ? '#fff' : '#00595c'} 
                      />
                      <Text style={[styles.slotText, selectedSlot === slot && styles.activeSlotText]}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Summary Box */}
                {selectedSlot && (
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLabel}>Karigar:</Text>
                      <Text style={styles.summaryVal}>Ali (AC Expert)</Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLabel}>Schedule:</Text>
                      <Text style={styles.summaryVal}>
                        {selectedDate === 'today' ? 'Today' : 'Tomorrow'}, {selectedSlot.split(' - ')[0]}
                      </Text>
                    </View>
                    <View style={[styles.summaryLine, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <Text style={styles.summaryLabel}>Base Fee:</Text>
                      <Text style={[styles.summaryVal, { color: '#00595c', fontWeight: 'bold' }]}>{providerPrice}</Text>
                    </View>
                  </View>
                )}

                {/* Submit Action */}
                <TouchableOpacity 
                  style={[styles.modalSubmitBtn, !selectedSlot && styles.modalSubmitBtnDisabled]}
                  disabled={!selectedSlot || isBookingSubmitting}
                  onPress={executeBooking}
                >
                  {isBookingSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="done" size={20} color="#fff" />
                      <Text style={styles.modalSubmitText}>Confirm and Book</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf8ff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#1a1a2e',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // ensure space for floating bottom bar
  },
  heroSection: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#00595c',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#e8fff5',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  providerName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: '#1a1a2e',
    textAlign: 'center',
  },
  providerService: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3e4949',
    marginTop: 4,
    textAlign: 'center',
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3e4949',
  },
  quickStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#bec9c9',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8fff5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,89,92,0.1)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#005c3e',
    marginRight: 6,
  },
  availabilityText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#005c3e',
  },
  smartMatchCard: {
    margin: 20,
    backgroundColor: '#e8fff5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#b3e8d8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  smartMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smartMatchTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#00595c',
  },
  smartMatchIntro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3e4949',
    lineHeight: 18,
    marginBottom: 16,
  },
  smartReasonItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  smartReasonIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b3e8d8',
    marginTop: 2,
  },
  smartReasonTextContent: {
    flex: 1,
  },
  smartReasonItemTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#00595c',
  },
  smartReasonItemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3e4949',
    lineHeight: 16,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#00595c',
  },
  metricLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#6e7979',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bec9c9',
    paddingHorizontal: 20,
    backgroundColor: '#fcf8ff',
  },
  tabItem: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#00595c',
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6e7979',
  },
  activeTabText: {
    color: '#00595c',
    fontFamily: 'Inter_600SemiBold',
  },
  tabContentContainer: {
    padding: 20,
    backgroundColor: '#fcf8ff',
  },
  aboutTab: {
    gap: 16,
  },
  aboutText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#1a1a2e',
  },
  sectionHeading: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
    marginTop: 8,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    gap: 4,
  },
  specChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#3e4949',
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
    gap: 12,
  },
  certDetails: {
    flex: 1,
  },
  certTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  certIssuer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
    marginTop: 2,
  },
  reviewsTab: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewUserMeta: {
    flex: 1,
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUserName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#1a1a2e',
  },
  verifiedReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8fff5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  verifiedReviewText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#005c3e',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  starsBox: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6e7979',
  },
  reviewComment: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3e4949',
    marginTop: 12,
  },
  portfolioTab: {
    gap: 12,
  },
  portfolioHeading: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  portfolioCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bec9c9',
  },
  portfolioImg: {
    width: '100%',
    height: 100,
  },
  portfolioText: {
    padding: 10,
  },
  portfolioCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#1a1a2e',
  },
  portfolioCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#6e7979',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#bec9c9',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  priceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#6e7979',
  },
  priceValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#00595c',
    marginTop: 2,
  },
  bookBtn: {
    backgroundColor: '#00595c',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    marginLeft: 16,
  },
  bookBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#1a1a2e',
  },
  modalCloseBtn: {
    padding: 4,
  },
  bookingForm: {
    gap: 16,
  },
  bookingFormLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#3e4949',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateOption: {
    flex: 1,
    backgroundColor: '#fcf8ff',
    borderWidth: 1,
    borderColor: '#bec9c9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeDateOption: {
    backgroundColor: '#e8fff5',
    borderColor: '#005c3e',
  },
  dateOptionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#3e4949',
  },
  activeDateOptionText: {
    color: '#005c3e',
  },
  dateOptionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6e7979',
    marginTop: 2,
  },
  activeDateOptionSub: {
    color: '#007751',
  },
  slotsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fcf8ff',
    borderWidth: 1,
    borderColor: '#bec9c9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  activeSlotItem: {
    backgroundColor: '#00595c',
    borderColor: '#00595c',
  },
  slotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#1a1a2e',
  },
  activeSlotText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  summaryContainer: {
    backgroundColor: '#f5f2ff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,89,92,0.06)',
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6e7979',
  },
  summaryVal: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#1a1a2e',
  },
  modalSubmitBtn: {
    backgroundColor: '#00595c',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#bec9c9',
  },
  modalSubmitText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  successIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8fff5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#005c3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#1a1a2e',
  },
  successSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#3e4949',
    textAlign: 'center',
    lineHeight: 20,
  },
  successAlertText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
    textAlign: 'center',
    backgroundColor: '#f5f2ff',
    padding: 12,
    borderRadius: 12,
    lineHeight: 18,
  },
  successDoneBtn: {
    backgroundColor: '#00595c',
    borderRadius: 12,
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  successDoneText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
