/**
 * SimpleForm - Formulário Simples
 * Para criar formulários com campos facilmente
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import SimpleButton from './SimpleButton';
import SimpleInput from './SimpleInput';

export type FormField = {
  id: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  value: string;
};

type Props = {
  fields: FormField[];
  onFieldChange: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
  loading?: boolean;
};

export default function SimpleForm({
  fields,
  onFieldChange,
  onSubmit,
  submitLabel = 'Salvar',
  disabled = false,
  loading = false,
}: Props) {
  return (
    <View style={styles.container}>
      {fields.map((field) => (
        <SimpleInput
          key={field.id}
          label={field.label}
          placeholder={field.placeholder}
          value={field.value}
          onChangeText={(text) => onFieldChange(field.id, text)}
          keyboardType={field.keyboardType}
          editable={!disabled && !loading}
        />
      ))}

      <View style={styles.buttonContainer}>
        <SimpleButton
          label={submitLabel}
          onPress={onSubmit}
          disabled={disabled || loading}
          loading={loading}
          size="large"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
});
