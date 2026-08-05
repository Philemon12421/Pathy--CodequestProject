import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Dimensions, Image, Platform
} from 'react-native';
import SafeMapView, { Marker, Polyline, Callout, Circle } from '../components/SafeMapView';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { incidentsAPI, adsAPI, routesAPI } from '../services/api';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');

const SEVERITY_COLORS: Record<string, string> = { low: '#10B981', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
const TYPE_ICONS: Record<string, string> = { accident: '🚗', hazard: '⚠️', crime: '🚨', weather: '🌩️', other: '📍' };

// ── Category chips for quick nearby searches ─────────────────────────────
const CATEGORY_CHIPS = [
  { label: 'Hotels', icon: 'bed-outline' as const, query: 'hotel' },
  { label: 'Restaurants', icon: 'restaurant-outline' as const, query: 'restaurant' },
  { label: 'Groceries', icon: 'cart-outline' as const, query: 'supermarket' },
  { label: 'Gas', icon: 'car-outline' as const, query: 'fuel station' },
  { label: 'ATMs', icon: 'cash-outline' as const, query: 'atm' },
  { label: 'Pharmacy', icon: 'medkit-outline' as const, query: 'pharmacy' },
];

// ── Google Maps Night-style dark map tiles ────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2138' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8899aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2138' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a4a6a' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#5a6a8a' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#3a4a6a' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#2a3a5a' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a2840' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e2d48' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6a7a9a' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#142a20' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a8a5a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#253252' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2540' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7a8aaa' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a3e62' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2a48' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9aaacc' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e2d48' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#6a7a9a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a7a' }] },
];


// Haversine formula in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapScreen({ navigation, route }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const mapRef = useRef<any>(null);
  const { user, userLocation, setUserLocation, incidents, setIncidents, myAds, ads, setAds, theme, avatarUri } = useStore();
  const isDark = theme === 'dark';
  const displayAvatar = avatarUri || (user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '')}${user.avatar_url}`) : null);
  const [search, setSearch] = useState('');
  const [directions, setDirections] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [mapMode, setMapMode] = useState<'standard' | 'satellite'>('standard'); // standard | satellite
  const [loading, setLoading] = useState(false);
  const [showAdBanner, setShowAdBanner] = useState<any>(null);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navSteps, setNavSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const navStepsRef = useRef<any[]>([]);
  const currentStepIndexRef = useRef(0);

  useEffect(() => { navStepsRef.current = navSteps; }, [navSteps]);
  useEffect(() => { currentStepIndexRef.current = currentStepIndex; }, [currentStepIndex]);

  useEffect(() => {
    initLocation();
    loadData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route.params?.selectedIncident) {
      const inc = route.params.selectedIncident;
      setSelectedMarker({ type: 'incident', data: inc });
      mapRef.current?.animateToRegion({
        latitude: parseFloat(inc.latitude),
        longitude: parseFloat(inc.longitude),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 800);
      navigation.setParams({ selectedIncident: null });
    }
  }, [route.params?.selectedIncident]);

  // Load a community route posted on the feed
  useEffect(() => {
    const cr = route.params?.communityRoute;
    if (!cr) return;
    navigation.setParams({ communityRoute: null });
    const load = async () => {
      setLoading(true);
      try {
        const origin = { latitude: cr.originLat, longitude: cr.originLng };
        const dest   = { latitude: cr.destinationLat, longitude: cr.destinationLng };
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&steps=true`;
        const routeRes = await fetch(osrmUrl);
        const routeData = await routeRes.json();
        if (routeData.code === 'Ok' && routeData.routes.length > 0) {
          const r = routeData.routes[0];
          const coords = r.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
          setDirections({
            origin,
            destination: dest,
            destName: cr.destinationName || cr.title,
            coords,
            distance: r.distance,
            duration: r.duration,
          });
          setNavSteps(r.legs[0].steps);
          setCurrentStepIndex(0);
          mapRef.current?.animateToRegion({
            latitude: (origin.latitude + dest.latitude) / 2,
            longitude: (origin.longitude + dest.longitude) / 2,
            latitudeDelta: Math.abs(origin.latitude - dest.latitude) * 2 + 0.05,
            longitudeDelta: Math.abs(origin.longitude - dest.longitude) * 2 + 0.05,
          }, 1000);
        } else {
          // Fallback: straight line
          setDirections({ origin, destination: dest, destName: cr.destinationName || cr.title, coords: [origin, dest], distance: 0, duration: 0 });
          mapRef.current?.animateToRegion({
            latitude: (origin.latitude + dest.latitude) / 2,
            longitude: (origin.longitude + dest.longitude) / 2,
            latitudeDelta: 0.1, longitudeDelta: 0.1,
          }, 800);
        }
      } catch {
        Alert.alert('Route error', 'Could not load the community route. Try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params?.communityRoute]);

  // Auto-search and plot route when navigated from AI with destination
  useEffect(() => {
    const dest = route.params?.destination;
    if (!dest) return;
    navigation.setParams({ destination: null });
    searchDestination(dest);
  }, [route.params?.destination]);


  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required for the map.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);

    // Watch location
    Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 }, (l: any) => {
      const newLoc = { latitude: l.coords.latitude, longitude: l.coords.longitude };
      setUserLocation(newLoc);

      if (isNavigating && mapRef.current) {
        mapRef.current.animateCamera({
          center: newLoc,
          pitch: 45,
          heading: l.coords.heading || 0,
          zoom: 18,
        });

        const steps = navStepsRef.current;
        const idx = currentStepIndexRef.current;
        if (steps && steps.length > 0 && idx < steps.length) {
          const step = steps[idx];
          if (step?.maneuver?.location) {
            const maneuverCoords = step.maneuver.location; // [lon, lat]
            const dist = getDistance(newLoc.latitude, newLoc.longitude, maneuverCoords[1], maneuverCoords[0]);

            // If within 30 meters of maneuver, progress to next step
            if (dist < 0.03 && idx < steps.length - 1) {
              setCurrentStepIndex(idx + 1);
            }
          }
        }
      }
    });
  };

  // Reload public ad list whenever user activates/deletes their own ads
  useEffect(() => {
    adsAPI.getAll().then(setAds).catch(() => {});
  }, [myAds]);

  const loadData = async () => {
    try {
      const [incs, adList] = await Promise.all([incidentsAPI.getAll(), adsAPI.getAll()]);
      setIncidents(incs);
      setAds(adList);
    } catch (e) {}
  };

  const [deleteTimer, setDeleteTimer] = useState(0);

  useEffect(() => {
    if (selectedMarker?.type === 'incident') {
      const inc = selectedMarker.data;
      const getRequiredMinutes = (severity: string) => {
        if (severity === 'medium') return 5;
        if (severity === 'high') return 10;
        if (severity === 'critical') return 15;
        return 2; // low
      };
      
      const calculateRemaining = () => {
        const reqMin = getRequiredMinutes(inc.severity);
        const createdTime = new Date(inc.created_at).getTime();
        const elapsedSec = (Date.now() - createdTime) / 1000;
        return Math.max(0, Math.ceil((reqMin * 60) - elapsedSec));
      };

      setDeleteTimer(calculateRemaining());

      const interval = setInterval(() => {
        const rem = calculateRemaining();
        setDeleteTimer(rem);
        if (rem <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedMarker]);

  const getMediaUrl = (mediaPath: string) => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}${mediaPath}`;
  };

  const timeAgo = (ts: any) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  const goToMyLocation = () => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01
    }, 800);
  };

  const searchDestination = async (overrideQuery?: any) => {
    const query = (typeof overrideQuery === 'string' ? overrideQuery : search).trim();
    if (!query) return;
    if (typeof overrideQuery === 'string') setSearch(overrideQuery);
    setLoading(true);
    try {
      // Geocode using Nominatim (free, no key needed)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'RouthFlowPathy/1.0' } }
      );
      const data = await res.json();
      if (!data.length) { Alert.alert('Not found', `No results found for "${query}".`); return; }

      const dest = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };

      // Calculate route from user location or fallback location
      const origin = userLocation || { latitude: 5.6037, longitude: -0.1870 };
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&steps=true`;
        const routeRes = await fetch(osrmUrl);
        const routeData = await routeRes.json();

        if (routeData.code === 'Ok' && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => ({
            latitude: c[1],
            longitude: c[0]
          }));

          setDirections({
            origin,
            destination: dest,
            destName: data[0].display_name,
            coords: coords,
            distance: route.distance,
            duration: route.duration
          });

          setNavSteps(route.legs[0].steps);
          setCurrentStepIndex(0);

          mapRef.current?.animateToRegion({
            latitude: (origin.latitude + dest.latitude) / 2,
            longitude: (origin.longitude + dest.longitude) / 2,
            latitudeDelta: Math.abs(origin.latitude - dest.latitude) * 2 + 0.05,
            longitudeDelta: Math.abs(origin.longitude - dest.longitude) * 2 + 0.05,
          }, 1000);
        } else {
          throw new Error("No route found");
        }
      } catch (err) {
        // Fallback to straight line
        setDirections({
          origin,
          destination: dest,
          destName: data[0].display_name,
          coords: [origin, dest]
        });
        setNavSteps([]);
        mapRef.current?.animateToRegion({ ...dest, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
      }
    } catch (e) {
      Alert.alert('Error', 'Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Search for nearby places by category chip strictly within user country & closest proximity
  const searchCategory = async (categoryQuery: string, label?: string) => {
    setSearch(label || categoryQuery);
    setLoading(true);
    try {
      const origin = userLocation || { latitude: 5.6037, longitude: -0.1870 };

      // Reverse geocode user location to extract country code to enforce country boundary
      let countryCode = '';
      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${origin.latitude}&lon=${origin.longitude}&format=json`,
          { headers: { 'User-Agent': 'SafeTrackApp/1.0' } }
        );
        const revData = await revRes.json();
        countryCode = revData.address?.country_code || '';
      } catch {}

      const delta = 0.15;
      const viewbox = `${origin.longitude - delta},${origin.latitude + delta},${origin.longitude + delta},${origin.latitude - delta}`;

      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(categoryQuery)}&format=json&lat=${origin.latitude}&lon=${origin.longitude}&viewbox=${viewbox}&bounded=1&limit=20`;
      if (countryCode) {
        url += `&countrycodes=${countryCode}`;
      }

      const res = await fetch(url, { headers: { 'User-Agent': 'SafeTrackApp/1.0' } });
      let data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        // Fallback without strict bounded viewbox, but still enforcing country code
        let fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(categoryQuery)}&format=json&lat=${origin.latitude}&lon=${origin.longitude}&limit=15`;
        if (countryCode) fallbackUrl += `&countrycodes=${countryCode}`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { 'User-Agent': 'SafeTrackApp/1.0' } });
        data = await fallbackRes.json();
      }

      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Not found', `No nearby ${label || categoryQuery} found in your area.`);
        return;
      }

      // Calculate distance for each result and sort to get the absolute CLOSEST local match
      const sorted = data.map((place: any) => {
        const pLat = parseFloat(place.lat);
        const pLng = parseFloat(place.lon);
        const dist = getDistance(origin.latitude, origin.longitude, pLat, pLng);
        return { ...place, pLat, pLng, dist };
      }).sort((a: any, b: any) => a.dist - b.dist);

      const closest = sorted[0];
      const dest = { latitude: closest.pLat, longitude: closest.pLng };
      const destName = closest.display_name?.split(',')[0] || closest.name || label || categoryQuery;

      // Plot route to closest location using HTTPS OSRM
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&steps=true`;
        const routeRes = await fetch(osrmUrl);
        const routeData = await routeRes.json();

        if (routeData.code === 'Ok' && routeData.routes.length > 0) {
          const r = routeData.routes[0];
          const coords = r.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));

          setDirections({
            origin,
            destination: dest,
            destName: `${destName} (${closest.dist < 1 ? Math.round(closest.dist * 1000) + 'm' : closest.dist.toFixed(1) + 'km'} away)`,
            coords: coords,
            distance: r.distance,
            duration: r.duration
          });

          setNavSteps(r.legs[0].steps);
          setCurrentStepIndex(0);

          mapRef.current?.animateToRegion({
            latitude: (origin.latitude + dest.latitude) / 2,
            longitude: (origin.longitude + dest.longitude) / 2,
            latitudeDelta: Math.max(Math.abs(origin.latitude - dest.latitude) * 2, 0.02),
            longitudeDelta: Math.max(Math.abs(origin.longitude - dest.longitude) * 2, 0.02),
          }, 1000);
        } else {
          throw new Error("No route found");
        }
      } catch (err) {
        setDirections({
          origin,
          destination: dest,
          destName: `${destName} (${closest.dist.toFixed(1)} km away)`,
          coords: [origin, dest]
        });
        setNavSteps([]);
        mapRef.current?.animateToRegion({ ...dest, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 1000);
      }
    } catch (e) {
      Alert.alert('Error', 'Category search failed. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentRoute = async () => {
    if (!directions) return;
    try {
      await routesAPI.save({
        name: directions.destName?.split(',')[0] || 'Route',
        origin_name: 'My Location',
        destination_name: directions.destName,
        origin_lat: directions.origin.latitude,
        origin_lng: directions.origin.longitude,
        destination_lat: directions.destination.latitude,
        destination_lng: directions.destination.longitude,
      });
      Alert.alert('✅ Saved', 'Route saved to your Routes tab');
    } catch (e) {
      Alert.alert('Error', 'Could not save route');
    }
  };

  const isPickerMode = route.params?.mode === 'routePicker';

  const handleLongPress = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
        { headers: { 'User-Agent': 'RouthFlowPathy/1.0' } }
      );
      const data = await res.json();
      const destName = data.display_name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      
      if (userLocation) {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${coords.longitude},${coords.latitude}?overview=full&geometries=geojson&steps=true`;
        const routeRes = await fetch(osrmUrl);
        const routeData = await routeRes.json();

        if (routeData.code === 'Ok' && routeData.routes.length > 0) {
          const r = routeData.routes[0];
          const routeCoords = r.geometry.coordinates.map((c: any) => ({
            latitude: c[1],
            longitude: c[0]
          }));

          setDirections({
            origin: userLocation,
            destination: coords,
            destName: destName,
            coords: routeCoords,
            distance: r.distance,
            duration: r.duration
          });

          setNavSteps(r.legs[0].steps);
          setCurrentStepIndex(0);
        } else {
          setDirections({
            origin: userLocation,
            destination: coords,
            destName: destName,
            coords: [userLocation, coords],
            distance: 0,
            duration: 0
          });
          setNavSteps([]);
        }
      }
    } catch (err) {
      setDirections({
        origin: userLocation,
        destination: coords,
        destName: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        coords: [userLocation, coords],
        distance: 0,
        duration: 0
      });
      setNavSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const defaultRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 6.6885, longitude: -1.6244, latitudeDelta: 0.1, longitudeDelta: 0.1 }; // Default: Kumasi

  const startNavigation = () => {
    setIsNavigating(true);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: 45,
        zoom: 18
      });
    }
  };

  const endNavigation = () => {
    setIsNavigating(false);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: 0,
        zoom: 14,
        heading: 0
      });
    }

    if (directions) {
      Alert.alert(
        '🎉 Navigation Complete!',
        'Would you like to post this completed route to the community feed?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Post Route',
            onPress: () => {
              navigation.navigate('PostRoute', {
                routeData: {
                  distance: directions.distance || 0,
                  duration: directions.duration || 0,
                  origin_name: 'My Location',
                  destination_name: directions.destName?.split(',')[0] || 'Destination',
                  origin_lat: directions.origin.latitude,
                  origin_lng: directions.origin.longitude,
                  destination_lat: directions.destination.latitude,
                  destination_lng: directions.destination.longitude
                }
              });
            }
          }
        ]
      );
    }
  };

  return (
    <View style={s.container}>
      <SafeMapView
        ref={mapRef}
        style={s.map}
        initialRegion={defaultRegion}
        mapType={mapMode}
        customMapStyle={isDark ? DARK_MAP_STYLE : []}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        onLongPress={handleLongPress}
      >
        {userLocation && (
     <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} flat>
     <View style={s.myLocationDot} />
     </Marker>
     )}

        {/* Incident markers */}
        {(incidents || []).map((inc: any) => (
          <Marker
            key={inc.id}
            coordinate={{ latitude: parseFloat(inc.latitude), longitude: parseFloat(inc.longitude) }}
            onPress={() => setSelectedMarker({ type: 'incident', data: inc })}
          >
            <View style={[s.incMarker, { backgroundColor: SEVERITY_COLORS[inc.severity] || COLORS.warning }]}>
              <Text style={s.markerEmoji}>{TYPE_ICONS[inc.type] || '📍'}</Text>
            </View>
            <Callout tooltip>
              <View style={s.callout}>
                <Text style={s.calloutTitle}>{inc.title}</Text>
                <Text style={s.calloutSub}>{inc.type} · {inc.severity}</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {(ads || []).map((ad: any) => {
          const lat = typeof ad.latitude === 'number' ? ad.latitude : parseFloat(ad.latitude);
          const lng = typeof ad.longitude === 'number' ? ad.longitude : parseFloat(ad.longitude);
          const radius = typeof ad.radius_km === 'number' ? ad.radius_km : parseFloat(ad.radius_km);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <React.Fragment key={ad.id}>
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={(radius || 5) * 1000}
                strokeColor={COLORS.accent + '44'}
                fillColor={COLORS.accent + '11'}
              />
              <Marker
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setShowAdBanner(ad)}
              >
                <View style={s.adMarker}>
                  <Ionicons name="storefront" size={16} color={COLORS.accent} />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Route polyline */}
        {directions && (
          <>
            <Marker coordinate={directions.destination} pinColor={COLORS.primary}>
              <View style={s.destMarker}>
                <Ionicons name="flag" size={18} color="#fff" />
              </View>
            </Marker>
            <Polyline
              coordinates={directions.coords}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          </>
        )}
      </SafeMapView>

      {/* ── Google Maps-style Floating Glass Search Bar ───────────────── */}
      {!isNavigating && (
        <View style={s.searchContainer}>
          <View style={s.searchBar}>
            {isPickerMode ? (
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={s.searchIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={isDark ? '#ccc' : '#555'} />
              </TouchableOpacity>
            ) : (
              <View style={s.searchPinIcon}>
                <Ionicons name="search" size={18} color="#006c44" />
              </View>
            )}
            <TextInput
              style={s.searchInput}
              placeholder="Search places, routes, or categories..."
              placeholderTextColor={isDark ? '#8899aa' : '#778899'}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={searchDestination}
              returnKeyType="search"
            />
            {loading && (
              <ActivityIndicator size="small" color="#006c44" style={{ marginRight: 8 }} />
            )}
            <TouchableOpacity
              style={s.searchAvatar}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={s.searchAvatarImg} />
              ) : (
                <Ionicons name="person-circle" size={32} color={isDark ? '#6EE7A0' : '#4caf7d'} />
              )}
            </TouchableOpacity>
          </View>

          {/* ── Category Chips ─────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {CATEGORY_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                style={s.chip}
                onPress={() => searchCategory(chip.query, chip.label)}
                activeOpacity={0.7}
              >
                <Ionicons name={chip.icon as any} size={14} color={isDark ? '#bcc8d6' : '#555'} />
                <Text style={s.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Route picker instructions banner */}
      {isPickerMode && !directions && (
        <View style={s.pickerBanner}>
          <Ionicons name="information-circle" size={18} color="#fff" />
          <Text style={s.pickerBannerText}>Long-press on map or search to select a destination</Text>
        </View>
      )}

      {/* ── Floating Map Controls (Google Maps style) ──────────────────── */}
      {!isNavigating && (
        <>
          {/* Layers / Map toggle button (right side, upper) */}
          <TouchableOpacity
            style={[s.floatingBtn, { top: 175, right: 16 }]}
            onPress={() => setMapMode(mapMode === 'standard' ? 'satellite' : 'standard')}
          >
            <Ionicons name={mapMode === 'standard' ? 'layers-outline' : 'map-outline'} size={22} color={isDark ? '#ccc' : '#555'} />
          </TouchableOpacity>

          {/* My Location button (right side, mid) */}
          <TouchableOpacity
            style={[s.floatingBtn, { bottom: 180, right: 16 }]}
            onPress={goToMyLocation}
          >
            <Ionicons name="locate" size={22} color={isDark ? '#ccc' : '#555'} />
          </TouchableOpacity>

          {/* Report Incident pill button (prominent bottom-left on map screen) */}
          {!isPickerMode && (
            <TouchableOpacity
              style={s.reportIncidentFab}
              onPress={() => navigation.navigate('Report')}
              activeOpacity={0.85}
            >
              <Ionicons name="warning" size={18} color="#fff" />
              <Text style={s.reportIncidentFabText}>Report Incident</Text>
            </TouchableOpacity>
          )}

          {/* Teal Directions FAB (bottom-right, Google Maps style) */}
          <TouchableOpacity
            style={s.directionsFab}
            onPress={() => {
              if (directions && navSteps.length > 0) {
                startNavigation();
              } else if (!isPickerMode) {
                navigation.navigate('Ads');
              }
            }}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Navigation Banner */}
      {isNavigating && navSteps.length > 0 && (
        <View style={s.navBanner}>
          <View style={s.navIconBox}>
            <Ionicons name="navigate" size={32} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.navInstruction}>{navSteps[currentStepIndex]?.maneuver?.instruction || 'Continue on route'}</Text>
            <Text style={s.navDistance}>
              {(navSteps[currentStepIndex]?.distance || 0).toFixed(0)}m until next step
            </Text>
          </View>
          <TouchableOpacity style={s.navExitBtn} onPress={endNavigation}>
            <Ionicons name="close-circle" size={28} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Route info bar */}
      {directions && !isNavigating && (
        <View style={s.routeBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.routeTitle} numberOfLines={1}>{directions.destName?.split(',')[0]}</Text>
            <Text style={s.routeSub}>{isPickerMode ? 'Selected destination' : 'Route ready'}</Text>
          </View>
          {isPickerMode ? (
            <TouchableOpacity
              style={[s.routeStartBtn, { backgroundColor: '#006c44' }]}
              onPress={() => {
                navigation.navigate('PostRoute', {
                  routeData: {
                    distance: directions.distance || 0,
                    duration: directions.duration || 0,
                    origin_name: 'My Location',
                    destination_name: directions.destName?.split(',')[0] || 'Destination',
                    origin_lat: directions.origin.latitude,
                    origin_lng: directions.origin.longitude,
                    destination_lat: directions.destination.latitude,
                    destination_lng: directions.destination.longitude
                  }
                });
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={s.routeStartText}>Use Route</Text>
            </TouchableOpacity>
          ) : (
            <>
              {navSteps.length > 0 && (
                <TouchableOpacity style={s.routeStartBtn} onPress={startNavigation}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={s.routeStartText}>Start</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.routeStartBtn, { backgroundColor: '#7C3AED', marginLeft: 4 }]}
                onPress={() => {
                  navigation.navigate('PostRoute', {
                    routeData: {
                      distance: directions.distance || 0,
                      duration: directions.duration || 0,
                      origin_name: 'My Location',
                      destination_name: directions.destName?.split(',')[0] || 'Destination',
                      origin_lat: directions.origin.latitude,
                      origin_lng: directions.origin.longitude,
                      destination_lat: directions.destination.latitude,
                      destination_lng: directions.destination.longitude
                    }
                  });
                }}
              >
                <Ionicons name="share-social" size={15} color="#fff" />
                <Text style={s.routeStartText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.routeSaveBtn} onPress={saveCurrentRoute}>
                <Ionicons name="bookmark" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={s.routeCloseBtn} onPress={() => { setDirections(null); setNavSteps([]); }}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Ad banner */}
      {showAdBanner && (
        <View style={s.adBanner}>
          {showAdBanner.image_url ? (
            <Image
              source={{ uri: getMediaUrl(showAdBanner.image_url) }}
              style={s.adBannerThumb}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="storefront" size={20} color={COLORS.accent} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.adBannerTitle}>{showAdBanner.business_name}</Text>
            <Text style={s.adBannerDesc} numberOfLines={2}>{showAdBanner.description}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdBanner(null)}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Incident Detail Overlay */}
      {selectedMarker?.type === 'incident' && (
        <View style={s.detailSheet}>
          <View style={s.detailSheetHeader}>
            <View style={s.detailTitleRow}>
              <View style={[s.incMarker, { backgroundColor: SEVERITY_COLORS[selectedMarker.data.severity] || COLORS.warning, marginRight: 8 }]}>
                <Text style={s.markerEmoji}>{TYPE_ICONS[selectedMarker.data.type] || '📍'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.detailSheetTitle}>{selectedMarker.data.title}</Text>
                <Text style={s.detailSheetMeta}>
                  Reported by {selectedMarker.data.reporter_name || 'Anonymous'} · {timeAgo(selectedMarker.data.created_at)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedMarker(null)} style={s.detailCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.detailScroll} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={s.badgeRow}>
              <View style={[s.sevBadge, { backgroundColor: SEVERITY_COLORS[selectedMarker.data.severity] || COLORS.warning }]}>
                <Text style={s.sevBadgeText}>{selectedMarker.data.severity} Intensity</Text>
              </View>
              <View style={[s.typeBadge, { backgroundColor: COLORS.border }]}>
                <Text style={s.typeBadgeText}>{selectedMarker.data.type}</Text>
              </View>
            </View>

            {selectedMarker.data.description ? (
              <Text style={s.detailDesc}>{selectedMarker.data.description}</Text>
            ) : null}

            {selectedMarker.data.media_url ? (
              <Image 
                source={{ uri: getMediaUrl(selectedMarker.data.media_url) }} 
                style={s.detailImage} 
                resizeMode="cover"
              />
            ) : null}
          </ScrollView>

          {/* Delete action if owner */}
          {user && user.id === selectedMarker.data.user_id && (
            <View style={s.deleteActionRow}>
              {deleteTimer > 0 ? (
                <View style={s.lockedContainer}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
                  <Text style={s.lockedText}>
                    Delete locked for {Math.floor(deleteTimer / 60)}m {deleteTimer % 60}s
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={s.deleteBtn} 
                  onPress={async () => {
                    Alert.alert(
                      'Confirm Delete',
                      'Are you sure you want to delete this safety report?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Delete', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await incidentsAPI.delete(selectedMarker.data.id);
                              setIncidents((incidents || []).filter((i: any) => i.id !== selectedMarker.data.id));
                              setSelectedMarker(null);
                              Alert.alert('Deleted', 'Incident report has been deleted.');
                            } catch (err: any) {
                              Alert.alert('Error', err.error || 'Failed to delete incident.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={s.deleteBtnText}>Delete Incident</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    myLocationDot: {
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: '#006c44',
      borderWidth: 3, borderColor: '#fff',
      ...SHADOW.sm,
    },
    pickerBanner: {
      position: 'absolute', top: 165, left: SPACING.lg, right: SPACING.lg,
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#006c44',
      borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
      ...SHADOW.md, zIndex: 10,
    },
    pickerBannerText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '600', flex: 1 },
    map: { flex: 1 },
    searchContainer: {
      position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40,
      left: 0, right: 0, zIndex: 20,
    },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surfaceGlass,
      marginHorizontal: SPACING.md, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md, height: 50,
      borderWidth: 1, borderColor: COLORS.border,
      ...SHADOW.md,
    },
    searchPinIcon: { marginRight: 8 },
    searchIconBtn: { padding: 4, marginRight: 4 },
    searchInput: {
      flex: 1, color: COLORS.text, fontSize: FONTS.sizes.md,
      fontWeight: '500', paddingVertical: 8,
    },
    searchAvatar: { marginLeft: 6 },
    searchAvatarImg: { width: 32, height: 32, borderRadius: 16 },
    chipsRow: {
      paddingHorizontal: SPACING.md, paddingTop: 10,
      paddingBottom: 6, gap: 8,
    },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surfaceGlass,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: RADIUS.full, borderWidth: 1,
      borderColor: COLORS.border, gap: 6,
      ...SHADOW.xs,
    },
    chipText: {
      color: COLORS.text, fontSize: FONTS.sizes.xs + 1,
      fontWeight: '600',
    },
    floatingBtn: {
      position: 'absolute', width: 44, height: 44,
      borderRadius: 22, backgroundColor: COLORS.surfaceGlass,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: COLORS.border,
      ...SHADOW.md, zIndex: 15,
    },
    reportIncidentFab: {
      position: 'absolute', bottom: 100, left: 16,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 12,
      borderRadius: RADIUS.full, ...SHADOW.lg, zIndex: 15,
    },
    reportIncidentFabText: {
      color: '#ffffff', fontSize: FONTS.sizes.sm,
      fontWeight: '700',
    },
    directionsFab: {
      position: 'absolute', bottom: 100, right: 16,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center',
      ...SHADOW.lg, zIndex: 15,
    },
    incMarker: {
      width: 34, height: 34, borderRadius: RADIUS.full,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2.5, borderColor: '#fff',
      ...SHADOW.sm,
    },
    markerEmoji: { fontSize: 14 },
    adMarker: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: COLORS.accent, ...SHADOW.xs,
    },
    destMarker: {
      width: 40, height: 40, borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      ...SHADOW.sm,
    },
    callout: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
      minWidth: 150, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
    },
    calloutTitle: { color: COLORS.text, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.sm },
    calloutSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2, textTransform: 'capitalize' },
    routeBar: {
      position: 'absolute', bottom: 90, left: SPACING.lg, right: SPACING.lg,
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceGlass,
      borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md,
      ...SHADOW.md, borderWidth: 1, borderColor: COLORS.border, zIndex: 25,
    },
    routeTitle: { color: COLORS.text, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
    routeSub: { color: COLORS.accent, fontSize: FONTS.sizes.xs, marginTop: 2 },
    routeStartBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.full, gap: 5, ...SHADOW.sm,
    },
    routeStartText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
    routeSaveBtn: { padding: 8 },
    routeCloseBtn: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    navBanner: {
      position: 'absolute', top: 55, left: SPACING.lg, right: SPACING.lg,
      backgroundColor: COLORS.surfaceGlass, borderRadius: RADIUS.xl,
      padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
      ...SHADOW.lg, borderWidth: 1, borderColor: COLORS.border, zIndex: 30,
    },
    navIconBox: {
      backgroundColor: COLORS.primary, width: 50, height: 50,
      borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center',
    },
    navInstruction: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
    navDistance: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
    navExitBtn: {
      width: 36, height: 36, borderRadius: RADIUS.full,
      backgroundColor: COLORS.dangerSoft, alignItems: 'center', justifyContent: 'center',
    },
    adBanner: {
      position: 'absolute', bottom: 168, left: SPACING.lg, right: SPACING.lg,
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceGlass,
      borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm, zIndex: 22,
    },
    adBannerTitle: { color: COLORS.text, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
    adBannerThumb: { width: 44, height: 44, borderRadius: RADIUS.md },
    adBannerDesc: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
    detailSheet: {
      position: 'absolute', bottom: 90, left: SPACING.lg, right: SPACING.lg,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
      maxHeight: 340, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.lg, zIndex: 30,
    },
    detailSheetHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.md,
      marginBottom: SPACING.md,
    },
    detailTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    detailSheetTitle: { color: COLORS.text, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.lg },
    detailSheetMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
    detailCloseBtn: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
      marginLeft: 8,
    },
    detailScroll: { flexGrow: 0 },
    badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, alignItems: 'center' },
    sevBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
    sevBadgeText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, textTransform: 'capitalize' },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.border },
    typeBadgeText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, textTransform: 'capitalize' },
    detailDesc: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, lineHeight: 22, marginBottom: SPACING.md },
    detailImage: { width: '100%', height: 150, borderRadius: RADIUS.lg, marginTop: 4 },
    deleteActionRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, marginTop: SPACING.sm },
    lockedContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: 14,
      borderWidth: 1, borderColor: COLORS.border, gap: 8,
    },
    lockedText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.danger, borderRadius: RADIUS.lg, padding: 14, gap: 6,
    },
    deleteBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  });
}