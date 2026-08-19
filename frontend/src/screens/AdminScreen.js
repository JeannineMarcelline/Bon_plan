import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    entreprises: 0,
    utilisateurs: 0,
    villes: 0,
    categories: 0,
  });
  const [entreprisesEnAttente, setEntreprisesEnAttente] = useState(0);

  // ===== CHARGER LES STATISTIQUES (migré vers Supabase) =====
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [entreprises, utilisateurs, villes, categories, entreprisesPending] = await Promise.all([
          supabase.from('entreprises').select('*', { count: 'exact', head: true }),
          supabase.from('utilisateurs').select('*', { count: 'exact', head: true }),
          supabase.from('villes').select('*', { count: 'exact', head: true }),
          supabase.from('categories').select('*', { count: 'exact', head: true }),
          supabase.from('entreprises').select('*', { count: 'exact', head: true }).eq('statutvalidation', 'en_attente'),
        ]);

        if (entreprises.error) throw entreprises.error;
        if (utilisateurs.error) throw utilisateurs.error;
        if (villes.error) throw villes.error;
        if (categories.error) throw categories.error;
        if (entreprisesPending.error) throw entreprisesPending.error;

        setStats({
          entreprises: entreprises.count || 0,
          utilisateurs: utilisateurs.count || 0,
          villes: villes.count || 0,
          categories: categories.count || 0,
        });
        setEntreprisesEnAttente(entreprisesPending.count || 0);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
        Alert.alert('Erreur', 'Impossible de charger les statistiques');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // ===== VÉRIFIER QUE L'UTILISATEUR EST ADMIN (NON MODIFIÉ) =====
  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={60} color="#e74c3c" />
          <Text style={styles.errorTitle}>Accès refusé</Text>
          <Text style={styles.errorText}>
            Seuls les Administrateurs peuvent accéder à cette page.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
 
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  // ===== MENU ADMIN (DESIGN POLI) =====
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* MODIFIE: Header réduit et plus compact */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Administration</Text>
          <Text style={styles.subtitle}>Gestion de la plateforme Bon Plan Madagascar</Text>
        </View>

        {/* MODIFIE: Stats compactes, layout horizontal */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="business" size={16} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.entreprises}</Text>
              <Text style={styles.statLabel}>Entreprises</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="people" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.utilisateurs}</Text>
              <Text style={styles.statLabel}>Utilisateurs</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="location" size={16} color="#F97316" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.villes}</Text>
              <Text style={styles.statLabel}>Villes</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="pricetags" size={16} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statNumber}>{stats.categories}</Text>
              <Text style={styles.statLabel}>Catégories</Text>
            </View>
          </View>
        </View>

        {/* MODIFIE: Menu sans fond d'icônes, plus d'espace */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Gestion des données</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminVilles')}
          >
            <Ionicons name="location-outline" size={22} color="#2563EB" />
            <Text style={styles.menuItemText}>Gérer les villes</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminCategorie')}
          >
            <Ionicons name="pricetags-outline" size={22} color="#2563EB" />
            <Text style={styles.menuItemText}>Gérer les catégories</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('admin', { screen: 'AdminEntreprises' })}
          >
            <Ionicons name="business-outline" size={22} color="#2563EB" />
            <Text style={styles.menuItemText}>Gérer les entreprises</Text>
            {entreprisesEnAttente > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{entreprisesEnAttente}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => navigation.navigate('admin', { screen: 'AdminUser' })}
          >
            <Ionicons name="people-outline" size={22} color="#2563EB" />
            <Text style={styles.menuItemText}>Gérer les utilisateurs</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>Bon Plan Madagascar v1.0 — Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== STYLES POLIS =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // MODIFIE: Header plus compact
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24, // MODIFIE: text-2xl au lieu de text-3xl
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, // MODIFIE: text-sm au lieu de text-base
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '400',
  },

  // MODIFIE: Stats avec icônes et design plus dense
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    width: '48%',
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
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
    fontWeight: '500',
  },

  // MODIFIE: Menu sans fond d'icônes, plus d'espace
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18, // MODIFIE: text-lg
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 4, // MODIFIE: mb-3
    letterSpacing: -0.3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // MODIFIE: py-4 au lieu de py-3
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 14, // MODIFIE: gap ajouté
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  notifBadge: {
    backgroundColor: '#DC2626',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // CENTER - Pour les écrans d'erreur/chargement
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // VERSION - Pied de page
  version: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});