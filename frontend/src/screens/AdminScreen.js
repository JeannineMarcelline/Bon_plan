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
import db from '../database/database';
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

  // ===== CHARGER LES STATISTIQUES (NON MODIFIÉ) =====
  useEffect(() => {
    const loadStats = async () => {
      try {
        const entreprises = await db.getAllAsync('SELECT COUNT(*) as total FROM entreprises');
        const utilisateurs = await db.getAllAsync('SELECT COUNT(*) as total FROM utilisateurs');
        const villes = await db.getAllAsync('SELECT COUNT(*) as total FROM villes');
        const categories = await db.getAllAsync('SELECT COUNT(*) as total FROM categories');

        setStats({
          entreprises: entreprises[0]?.total || 0,
          utilisateurs: utilisateurs[0]?.total || 0,
          villes: villes[0]?.total || 0,
          categories: categories[0]?.total || 0,
        });
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

        {/* MODIFIE: Stats avec icônes et design plus dense */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.entreprises}</Text>
              <Text style={styles.statIcon}>🏢</Text>
            </View>
            <Text style={styles.statLabel}>Entreprises</Text>
            <View style={styles.statTrend}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={styles.trendText}>+2 ce mois</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.utilisateurs}</Text>
              <Text style={styles.statIcon}>👥</Text>
            </View>
            <Text style={styles.statLabel}>Utilisateurs</Text>
            <View style={styles.statTrend}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={styles.trendText}>+5 ce mois</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.villes}</Text>
              <Text style={styles.statIcon}>📍</Text>
            </View>
            <Text style={styles.statLabel}>Villes</Text>
            <View style={styles.statTrend}>
              <Ionicons name="remove-outline" size={14} color="#6B7280" />
              <Text style={[styles.trendText, styles.trendNeutral]}>Stable</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.categories}</Text>
              <Text style={styles.statIcon}>🏷️</Text>
            </View>
            <Text style={styles.statLabel}>Catégories</Text>
            <View style={styles.statTrend}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={styles.trendText}>+1 ce mois</Text>
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
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // MODIFIE: rounded-2xl
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 28, // MODIFIE: text-3xl au lieu de text-4xl
    fontWeight: 'bold',
    color: '#2563EB',
    letterSpacing: -1,
  },
  statIcon: {
    fontSize: 20, // MODIFIE: w-5 h-5 en taille de police
    color: '#9CA3AF',
  },
  statLabel: {
    fontSize: 14, // MODIFIE: text-sm au lieu de text-base
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  trendNeutral: {
    color: '#6B7280', // MODIFIE: gris pour Stable
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