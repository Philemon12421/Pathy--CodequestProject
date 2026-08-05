import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export class AnimatedRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;

  constructor(opts: any = {}) {
    this.latitude = opts.latitude || 0;
    this.longitude = opts.longitude || 0;
    this.latitudeDelta = opts.latitudeDelta || 0.01;
    this.longitudeDelta = opts.longitudeDelta || 0.01;
  }

  setValue(opts: any) {
    Object.assign(this, opts);
  }

  timing() {
    return { start: (cb?: any) => cb && cb() };
  }

  spring() {
    return { start: (cb?: any) => cb && cb() };
  }
}

export const Marker = ({ children, title, description, coordinate, onPress, style }: any) => {
  return (
    <View style={[styles.markerContainer, style]}>
      {children ? children : (
        <View style={styles.defaultMarker}>
          <View style={styles.markerPin} />
          {title ? <Text style={styles.markerTitle}>{title}</Text> : null}
        </View>
      )}
    </View>
  );
};

export const Polyline = ({ strokeColor = '#006c44', strokeWidth = 3, style }: any) => {
  return <View style={[{ height: strokeWidth, backgroundColor: strokeColor, opacity: 0.8 }, style]} />;
};

export const Circle = ({ children, fillColor = 'rgba(0,108,68,0.2)', strokeColor = '#006c44', style }: any) => {
  return (
    <View style={[{ backgroundColor: fillColor, borderColor: strokeColor, borderWidth: 1, borderRadius: 9999 }, style]}>
      {children}
    </View>
  );
};

export const Callout = ({ children, onPress, style }: any) => {
  return <View style={[styles.callout, style]}>{children}</View>;
};

export const MapView = forwardRef(({ children, style, initialRegion, region, onPress, ...props }: any, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: (r: any, d?: number) => {},
    animateCamera: (c: any, opts?: any) => {},
    fitToCoordinates: (coords: any, opts?: any) => {},
    setNativeProps: (props: any) => {},
  }));

  const lat = region?.latitude || initialRegion?.latitude;
  const lng = region?.longitude || initialRegion?.longitude;

  return (
    <View style={[styles.mapContainer, style]}>
      {lat && lng ? (
        <iframe
          title="Web Map View"
          width="100%"
          height="100%"
          style={{ border: 0, width: '100%', height: '100%' }}
          loading="lazy"
          src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
        />
      ) : (
        <View style={styles.fallbackBg}>
          <Text style={styles.fallbackText}>🗺️ Interactive Web Map View</Text>
        </View>
      )}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        {children}
      </View>
    </View>
  );
});

export const UrlTile = () => null;
export const WMSTile = () => null;
export const Overlay = () => null;
export const Geojson = () => null;
export const Polygon = () => null;

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#1a2e26',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#11221c',
    width: '100%',
  },
  fallbackText: {
    color: '#4caf7d',
    fontWeight: '600',
    fontSize: 14,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultMarker: {
    alignItems: 'center',
  },
  markerPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E24B4A',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default MapView;
