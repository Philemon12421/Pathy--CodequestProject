import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Marker = ({ children }: any) => <>{children}</>;
export const Polyline = () => null;
export const Callout = ({ children }: any) => <>{children}</>;
export const Circle = () => null;

const MapViewWebMock = (props: any) => {
  return (
    <View style={[styles.container, props.style]}>
      <Text style={styles.text}>🗺️ Interactive Map (Native Mobile Only)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e7fff1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    minHeight: 180,
  },
  text: {
    color: '#006c44',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default MapViewWebMock;
