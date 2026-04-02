/**
 * SimpleButton - Botão Grande e Intuitivo
 * Perfeito para uso mobile e infantil
 */

import React from 'react';
import { Pressable, StyleSheet, Text, ActivityIndicator, View } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'large' | 'medium' | 'small';
};

export default function SimpleButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'large',
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" size="large" />
      ) : (
        <Text style={[styles.text, styles[`text-${size}`]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginVertical: 8,
  },
  large: {
    paddingVertical: 16,
  },
  medium: {
    paddingVertical: 12,
  },
  small: {
    paddingVertical: 8,
  },
  primary: {
    backgroundColor: '#7C5CFF',
  },
  secondary: {
    backgroundColor: '#4EC5FF',
  },
  danger: {
    backgroundColor: '#FF6B7A',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: '#F4F2FF',
    fontWeight: '700',
    textAlign: 'center',
  },
  'text-large': {
    fontSize: 18,
  },
  'text-medium': {
    fontSize: 16,
  },
  'text-small': {
    fontSize: 14,
  },
});
