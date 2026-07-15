import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

type NutritionLog = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (session) fetchLogs();
    }, [session])
  );

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', session?.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete Meal', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(id) },
    ]);
  }

  async function deleteLog(id: string) {
    // Optimistic UI update
    const previousLogs = [...logs];
    setLogs(logs.filter(log => log.id !== id));

    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id);
    if (error) {
      console.error('Error deleting log:', error.message);
      Alert.alert('Error', 'Failed to delete meal');
      setLogs(previousLogs); // Revert on failure
    }
  }

  const totals = logs.reduce(
    (acc, curr) => ({
      calories: acc.calories + (curr.calories || 0),
      protein: acc.protein + (curr.protein || 0),
      carbs: acc.carbs + (curr.carbs || 0),
      fat: acc.fat + (curr.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const renderLogItem = ({ item }: { item: NutritionLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logName}>{item.food_name}</Text>
        <TouchableOpacity onPress={() => confirmDelete(item.id, item.food_name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.deleteButton}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.logMacrosRow}>
        <View style={styles.logMacros}>
          <Text style={styles.macroText}>P: {item.protein}g</Text>
          <Text style={styles.macroText}>C: {item.carbs}g</Text>
          <Text style={styles.macroText}>F: {item.fat}g</Text>
        </View>
        <Text style={styles.logCalories}>{item.calories} kcal</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Overview</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{totals.calories}</Text>
          <Text style={styles.mainStatLabel}>KCAL</Text>
        </View>
        <View style={styles.macrosContainer}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.fat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Meals</Text>
      {loading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meals logged today. Snap a photo!</Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/camera')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>📷</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutText: {
    color: '#ff4757',
    fontWeight: '600',
  },
  dashboard: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 24,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 16,
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  macroLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  logCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  logCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  logMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  macroText: {
    fontSize: 13,
    color: '#aaaaaa',
  },
  deleteButton: {
    color: '#ff4757',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#4F46E5',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 28,
  },
});
