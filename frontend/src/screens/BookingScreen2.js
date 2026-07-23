import React from 'react';
import { View, Text, StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingsScreen2() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📋 Mes réservations</Text>
      <Text style={styles.message}>Aucune réservation pour le moment</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
  message: { fontSize: 16, color: '#95a5a6', textAlign: 'center', marginTop: 50 },
});