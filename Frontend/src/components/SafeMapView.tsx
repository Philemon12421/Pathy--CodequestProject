import React, { Component, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapViewNative, {
  Marker as MarkerNative,
  Polyline as PolylineNative,
  Callout as CalloutNative,
  Circle as CircleNative,
} from 'react-native-maps';

export const Marker = MarkerNative;
export const Polyline = PolylineNative;
export const Callout = CalloutNative;
export const Circle = CircleNative;

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('SafeMapView ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackIcon}>🗺️</Text>
            <Text style={styles.fallbackTitle}>Map Preview Mode</Text>
            <Text style={styles.fallbackSub}>Interactive map unavailable</Text>
          </View>
        )
      );
    }
    return this.props.children;
  }
}

const SafeMapView = forwardRef((props: any, ref) => {
  const innerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any, duration?: number) => {
      try {
        innerRef.current?.animateToRegion?.(region, duration);
      } catch (e) {
        console.warn('SafeMapView animateToRegion warning:', e);
      }
    },
    animateCamera: (camera: any, opts?: any) => {
      try {
        innerRef.current?.animateCamera?.(camera, opts);
      } catch (e) {
        console.warn('SafeMapView animateCamera warning:', e);
      }
    },
    fitToCoordinates: (coords: any, opts?: any) => {
      try {
        innerRef.current?.fitToCoordinates?.(coords, opts);
      } catch (e) {
        console.warn('SafeMapView fitToCoordinates warning:', e);
      }
    },
    setNativeProps: (nativeProps: any) => {
      try {
        innerRef.current?.setNativeProps?.(nativeProps);
      } catch (e) {
        console.warn('SafeMapView setNativeProps warning:', e);
      }
    },
  }));

  const { style, children, ...restProps } = props;

  return (
    <MapErrorBoundary
      fallback={
        <View style={[styles.fallbackContainer, style]}>
          <Text style={styles.fallbackIcon}>🗺️</Text>
          <Text style={styles.fallbackTitle}>Map Preview Mode</Text>
          <Text style={styles.fallbackSub}>Interactive map unavailable</Text>
        </View>
      }
    >
      <MapViewNative ref={innerRef} style={style} {...restProps}>
        {children}
      </MapViewNative>
    </MapErrorBoundary>
  );
});

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#1a2e26',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 180,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  fallbackTitle: {
    color: '#4caf7d',
    fontWeight: '700',
    fontSize: 15,
  },
  fallbackSub: {
    color: '#8899aa',
    fontSize: 12,
    marginTop: 2,
  },
});

export default SafeMapView;
