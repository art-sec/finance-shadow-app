/**
 * SimpleInput - Input Grande e Fácil de Usar
 * Para entrada de dados para crianças
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default' | 'email-address';
  error?: string;
  help?: string;
  editable?: boolean;
  secureTextEntry?: boolean;
};

export default function SimpleInput({
  label,
  value,
  onChangeText,
  placeholder = '',
  keyboardType = 'default',
  error,
  help,
  editable = true,
  secureTextEntry = false,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8C8FB3"
        keyboardType={keyboardType}
        editable={editable}
        secureTextEntry={secureTextEntry}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {help && <Text style={styles.helpText}>{help}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A7ABDE',
  },
  input: {
    fontSize: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2F63',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0E1026',
    color: '#F5F2FF',
  },
  inputError: {
    borderColor: '#FF9BC2',
    backgroundColor: '#1A0E1F',
  },
  inputDisabled: {
    backgroundColor: '#0B0B1A',
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF9BC2',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#8C8FB3',
    fontWeight: '400',
  },
});
