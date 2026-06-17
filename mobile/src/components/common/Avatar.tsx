import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, Text, View, ViewStyle } from 'react-native';

interface AvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle;
}

const COLORS = ['#4f87ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getColor(name: string): string {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

export function Avatar({ avatarUrl, name, size = 40, style }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const radius = size / 2;
  const fontSize = Math.round(size * 0.4);

  if (avatarUrl && !imgError) {
    const imgStyle: StyleProp<ImageStyle> = [
      { width: size, height: size, borderRadius: radius },
      style as ImageStyle | undefined,
    ];
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={imgStyle}
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: getColor(name),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize }}>{initial}</Text>
    </View>
  );
}
