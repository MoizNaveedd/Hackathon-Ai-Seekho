import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { getProviders, Provider } from '../services/apiService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 12;

export default function ProvidersMapScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const flatListRef = useRef<FlatList<Provider> | null>(null);

  // Parse starting coordinates or use default (Islamabad)
  const initialLat = searchParams.latitude ? parseFloat(searchParams.latitude as string) : 33.6844;
  const initialLng = searchParams.longitude ? parseFloat(searchParams.longitude as string) : 73.0479;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Region state
  const [region, setRegion] = useState({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await getProviders({
        latitude: initialLat,
        longitude: initialLng,
        limit: 30
      });
      if (res && res.providers) {
        const validProviders = res.providers.filter(p => p.latitude !== null && p.longitude !== null && p.latitude !== undefined && p.longitude !== undefined);
        setProviders(validProviders);
        // Automatically select the first provider, if any
        if (validProviders.length > 0) {
          setSelectedProviderId(validProviders[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching providers for map:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter providers with coordinates for the map
  const mapProviders = providers.filter(p => p.latitude !== null && p.longitude !== null && p.latitude !== undefined && p.longitude !== undefined);

  // Focus Map on a Coordinate
  const focusOnCoordinate = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }, 500);
    }
  };

  // When a marker is pressed
  const handleMarkerPress = (prov: Provider) => {
    if (!prov.latitude || !prov.longitude) return;
    setSelectedProviderId(prov.id);
    focusOnCoordinate(prov.latitude, prov.longitude);

    // Scroll flatlist to this provider
    const index = providers.findIndex(p => p.id === prov.id);
    if (index !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5
        });
      } catch (err) {
        console.warn("FlatList scrollToIndex failed:", err);
      }
    }
  };

  // When item in list is pressed
  const handleListItemPress = (prov: Provider) => {
    setSelectedProviderId(prov.id);
    if (prov.latitude && prov.longitude) {
      focusOnCoordinate(prov.latitude, prov.longitude);
    }
  };

  const handleBookProvider = (prov: Provider) => {
    router.push({
      pathname: '/provider-profile',
      params: {
        id: prov.id.toString(),
        name: prov.name,
        service: prov.service_type || 'Specialist',
        price: prov.hourly_rate ? `Rs ${prov.hourly_rate} Base Fee` : 'Rs 1,200 Base Fee'
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!!searchParams.latitude}
      >
        

        {/* Dynamic Provider Markers */}
        {mapProviders.map((prov) => {
          const isSelected = selectedProviderId === prov.id;
          return (
            <Marker
              key={prov.id}
              coordinate={{
                latitude: prov.latitude!,
                longitude: prov.longitude!,
              }}
              onPress={() => handleMarkerPress(prov)}
              title={prov.name}
              description={prov.service_type}
            >
              <View style={[
                styles.markerBubble,
                isSelected && styles.markerBubbleSelected
              ]}>
                <MaterialIcons 
                  name={isSelected ? "construction" : "build"} 
                  size={14} 
                  color={isSelected ? "#fff" : "#00595c"} 
                />
                <Text style={[
                  styles.markerText,
                  isSelected && styles.markerTextSelected
                ]}>
                  {prov.name.split(' ')[0]}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Header */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Providers Near You</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchProviders}>
          <MaterialIcons name="refresh" size={22} color="#00595c" />
        </TouchableOpacity>
      </View>

      {/* Floating Dynamic Bottom List Carousel */}
      <View style={[styles.carouselContainer, { bottom: insets.bottom + 16 }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00595c" />
            <Text style={styles.loadingText}>Fetching nearby technicians...</Text>
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No providers found in this area.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            horizontal
            data={providers}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselList}
            getItemLayout={(data, index) => ({
              length: CARD_WIDTH + CARD_SPACING,
              offset: (CARD_WIDTH + CARD_SPACING) * index,
              index
            })}
            renderItem={({ item }) => {
              const isSelected = selectedProviderId === item.id;
              const hasCoords = item.latitude !== null && item.longitude !== null;
              
              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected
                  ]}
                  onPress={() => handleListItemPress(item)}
                >
                  <View style={styles.cardHeader}>
                    <Image
                      source={
                        item.name.includes("Ali") 
                          ? require('../../assets/images/ali_profile.png') 
                          : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=00595c&color=fff` }
                      }
                      style={styles.cardImage}
                    />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardService} numberOfLines={1}>
                        {item.service_type || 'Specialist'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="star" size={16} color="#FFB300" />
                      <Text style={styles.cardRating}>
                        {item.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.cardLocation}>
                        · {item.location || 'Islamabad'}
                      </Text>
                    </View>
                    
                    {!hasCoords && (
                      <View style={styles.pendingCoordsBadge}>
                        <Text style={styles.pendingCoordsText}>No GPS</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.bookButton}
                      onPress={() => handleBookProvider(item)}
                    >
                      <Text style={styles.bookButtonText}>View Profile</Text>
                      <MaterialIcons name="chevron-right" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarkerOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 89, 92, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00595c',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerBubble: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#00595c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  markerBubbleSelected: {
    backgroundColor: '#00595c',
    borderColor: '#003a3d',
  },
  markerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#00595c',
  },
  markerTextSelected: {
    color: '#fff',
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#1a1a2e',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  carouselList: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSelected: {
    borderColor: '#00595c',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00595c',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#1a1a2e',
  },
  cardService: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRating: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1a1a2e',
    marginLeft: 4,
  },
  cardLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6e7979',
  },
  pendingCoordsBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingCoordsText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#ef4444',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  bookButton: {
    backgroundColor: '#00595c',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bookButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6e7979',
    marginTop: 12,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6e7979',
  },
});
