/**
 * SimpleList - Lista Simples e Clara
 * Para mostrar itens com ações
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';

export type SimpleListItem = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
};

type Props = {
  items: SimpleListItem[];
  onDelete?: (id: string) => void;
  empty?: string;
};

export default function SimpleList({ items, onDelete, empty = 'Nenhum item' }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{empty}</Text>
      </View>
    );
  }

  return (
    <FlatList
      scrollEnabled={false}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            )}
            {item.value && <Text style={styles.value}>{item.value}</Text>}
          </View>
          {onDelete && (
            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.deleteBtnPressed,
              ]}
              onPress={() => onDelete(item.id)}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </Pressable>
          )}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8C8FB3',
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#0E1026',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F4F2FF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C8FB3',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6DDFB5',
  },
  separator: {
    height: 1,
    backgroundColor: '#2B2F63',
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3D1A2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnPressed: {
    opacity: 0.7,
  },
  deleteBtnText: {
    fontSize: 20,
  },
});
