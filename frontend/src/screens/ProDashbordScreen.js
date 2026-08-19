import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ProDashbordScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entreprise, setEntreprise] = useState(null);
  const [stats, setStats] = useState({ vehicules: 0, reservations: 0, enAttente: 0 });

  const loadData = async () => {
    try {
    const { data: entrepriseData, error: entrepriseError } = await supabase
  .from('entreprises')
  .select('*')
  .eq('utilisateur_id', user.id)
  .maybeSingle();

if (entrepriseError) throw entrepriseError;

if (entrepriseData) {
  setEntreprise(entrepriseData);

  const { count: nbVehicules } = await supabase
    .from('vehicules')
    .select('*', { count: 'exact', head: true })
    .eq('id_entreprise', entrepriseData.id);

  const { data: vehiculesIds } = await supabase
    .from('vehicules')
    .select('id_vehicule')
    .eq('id_entreprise', entrepriseData.id);

  const idsVehicules = (vehiculesIds || []).map((v) => v.id_vehicule);

  let nbReservations = 0;
  let nbEnAttente = 0;
  if (idsVehicules.length > 0) {
    const { data: reservationsData, error: reservationsError } = await supabase
      .from('reservation_transport')
      .select('statut')
      .in('id_vehicule', idsVehicules);

    if (reservationsError) throw reservationsError;

    nbReservations = (reservationsData || []).length;
    nbEnAttente = (reservationsData || []).filter((r) => r.statut === 'en_attente').length;
  }

  setStats({
    vehicules: nbVehicules || 0,
    reservations: nbReservations,
    enAttente: nbEnAttente,
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
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Créer mon entreprise</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{entreprise.nom?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.eyebrow}>Dashboard Pro</Text>
              <Text style={styles.title}>{entreprise.nom}</Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            entreprise.statutvalidation === 'valide' && styles.statusValid,
            entreprise.statutvalidation === 'en_attente' && styles.statusPending,
            entreprise.statutvalidation !== 'valide' && entreprise.statutvalidation !== 'en_attente' && styles.statusRefused,
          ]}>
            <Ionicons
              name={
                entreprise.statutvalidation === 'valide' ? 'checkmark-circle' :
                entreprise.statutvalidation === 'en_attente' ? 'time' :
                'close-circle'
              }
              size={14}
              color={
                entreprise.statutvalidation === 'valide' ? '#16A34A' :
                entreprise.statutvalidation === 'en_attente' ? '#D97706' :
                '#DC2626'
              }
            />
            <Text style={styles.statusText}>
              {entreprise.statutvalidation === 'valide' ? 'Validée' :
               entreprise.statutvalidation === 'en_attente' ? 'En attente' :
               'Refusée'}
            </Text>
          </View>
        </View>

        {/* Cartes statistiques */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="bus" size={16} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.vehicules}</Text>
              <Text style={styles.statLabel}>Véhicules</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="calendar" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.reservations}</Text>
              <Text style={styles.statLabel}>Réservations</Text>
            </View>
          </View>
        </View>

        {/* Menu des actions */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Gestion</Text>

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
            onPress={() => navigation.navigate('MesVehicules')}
          >
            <Ionicons name="list-outline" size={24} color="#28a745" />
            <Text style={styles.menuItemText}>Mes véhicules</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastMenuItem]}
            onPress={() => navigation.navigate('ProReservation')}
          >
            <Ionicons name="calendar-outline" size={24} color="#ffc107" />
            <Text style={styles.menuItemText}>Mes réservations</Text>
            {stats.enAttente > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.enAttente}</Text>
              </View>
            )}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  headerInfo: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: { fontSize: 19, fontWeight: 'bold', color: '#111827', letterSpacing: -0.3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  statusValid: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusRefused: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#111827', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 1, fontWeight: '500' },
  menuSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lastMenuItem: { borderBottomWidth: 0 },
  menuItemText: { flex: 1, fontSize: 16, color: '#2c3e50', marginLeft: 12 },
  notifBadge: {
    backgroundColor: '#DC2626',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  notifBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noCompanyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center' },
  version: { textAlign: 'center', marginTop: 20, fontSize: 12, color: '#95a5a6' },
});