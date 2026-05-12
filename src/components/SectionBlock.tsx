import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

type Props = {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
  children: React.ReactNode;
  noPad?:   boolean;
};

export default function SectionBlock({ title, subtitle, action, children, noPad }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {action && <View>{action}</View>}
      </View>
      <View style={noPad ? styles.bodyNoPad : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerText: { gap: 2 },
  title:    { fontSize: 14, fontWeight: '700', color: C.text1, letterSpacing: 0.1 },
  subtitle: { fontSize: 12, color: C.text2 },
  body:     { padding: 20 },
  bodyNoPad: {},
});
