import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';

export default function ProDashbordScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entreprise, setEntreprise] = useState(null);
  const [stats, setStats] = useState({ vehicules: 0, reservations: 0 });

  const loadData = async () => {
    try {
      // 1. Récupérer l'entreprise du Pro
      const entreprises = await db.getAllAsync(
        'SELECT * FROM entreprises WHERE utilisateur_id = ?',
        [user.id]
      );
      if (entreprises.length > 0) {
        setEntreprise(entreprises[0]);

        // 2. Compter les véhicules
        const vehicules = await db.getAllAsync(
          'SELECT COUNT(*) as total FROM vehicules WHERE id_entreprise = ?',
          [entreprises[0].id]
        );
        // 3. Compter les réservations
        const reservations = await db.getAllAsync(
          'SELECT COUNT(*) as total FROM reservation_transport WHERE id_vehicule IN (SELECT id_vehicule FROM vehicules WHERE id_entreprise = ?)',
          [entreprises[0].id]
        );

        setStats({
          vehicules: vehicules[0]?.total || 0,
          reservations: reservations[0]?.total || 0,
        });
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.noCompanyText}>Vous n'avez pas encore d'entreprise.</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCompany')}
        >
          <Text style={styles.addButtonText}>➕ Créer mon entreprise</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>📊 Dashboard Pro</Text>
          <Text style={styles.subtitle}>{entreprise.nom}</Text>
          <View style={[
            styles.statusBadge,
            entreprise.statutValidation === 'valide' && styles.statusValid,
            entreprise.statutValidation === 'en_attente' && styles.statusPending,
          ]}>
            <Text style={styles.statusText}>
              {entreprise.statutValidation === 'valide' ? '✅ Validée' :
               entreprise.statutValidation === 'en_attente' ? '⏳ En attente' :
               '❌ Refusée'}
            </Text>
          </View>
        </View>

        {/* Cartes statistiques */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#007BFF' }]}>
            <Ionicons name="bus-outline" size={28} color="#fff" />
            <Text style={styles.statNumber}>{stats.vehicules}</Text>
            <Text style={styles.statLabel}>Véhicules</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#28a745' }]}>
            <Ionicons name="calendar-outline" size={28} color="#fff" />
            <Text style={styles.statNumber}>{stats.reservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </View>
        </View>

        {/* Menu des actions */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>⚙️ Gestion</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AddVehicle')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007BFF" />
            <Text style={styles.menuItemText}>Ajouter un véhicule</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AddVehicle')}
          >
            <Ionicons name="list-outline" size={24} color="#28a745" />
            <Text style={styles.menuItemText}>Mes véhicules</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastMenuItem]}
            onPress={() => navigation.navigate('MesReservationsTransport')}
          >
            <Ionicons name="calendar-outline" size={24} color="#ffc107" />
            <Text style={styles.menuItemText}>Mes réservations</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>Bon Plan Madagascar v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  statusValid: { backgroundColor: '#d4edda' },
  statusPending: { backgroundColor: '#fff3cd' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  statLabel: { fontSize: 14, color: '#fff', opacity: 0.8 },
  menuSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lastMenuItem: { borderBottomWidth: 0 },
  menuItemText: { flex: 1, fontSize: 16, color: '#2c3e50', marginLeft: 12 },
  addButton: { backgroundColor: '#007BFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noCompanyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center' },
  version: { textAlign: 'center', marginTop: 20, fontSize: 12, color: '#95a5a6' },
});