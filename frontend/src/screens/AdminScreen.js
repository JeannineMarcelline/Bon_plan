import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
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

  // ===== CHARGER LES STATISTIQUES =====
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

  // ===== VÉRIFIER QUE L'UTILISATEUR EST ADMIN =====
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
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  // ===== MENU ADMIN =====
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>🔐 Administration</Text>
          <Text style={styles.subtitle}>Gestion de la plateforme</Text>
        </View>

        {/* Cartes statistiques */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#007BFF' }]}>
            <Text style={styles.statNumber}>{stats.entreprises}</Text>
            <Text style={styles.statLabel}>Entreprises</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#28a745' }]}>
            <Text style={styles.statNumber}>{stats.utilisateurs}</Text>
            <Text style={styles.statLabel}>Utilisateurs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ffc107' }]}>
            <Text style={styles.statNumber}>{stats.villes}</Text>
            <Text style={styles.statLabel}>Villes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#17a2b8' }]}>
            <Text style={styles.statNumber}>{stats.categories}</Text>
            <Text style={styles.statLabel}>Catégories</Text>
          </View>
        </View>

        {/* Menu des actions */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Gestion des données</Text>

      <TouchableOpacity
  style={styles.menuItem}
  onPress={() => navigation.navigate('AdminVilles')}
>
  <Ionicons name="location-outline" size={24} color="#007BFF" />
  <Text style={styles.menuItemText}>Gérer les villes</Text>
  <Ionicons name="chevron-forward" size={20} color="#ccc" />
</TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminCategorie')}
          >
            <Ionicons name="pricetags-outline" size={24} color="#28a745" />
            <Text style={styles.menuItemText}>Gérer les catégories</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminEntreprises')}
          >
            <Ionicons name="business-outline" size={24} color="#ffc107" />
            <Text style={styles.menuItemText}>Gérer les entreprises</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminUser')}
          >
            <Ionicons name="people-outline" size={24} color="#17a2b8" />
            <Text style={styles.menuItemText}>Gérer les utilisateurs</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>Bon Plan Madagascar v1.0 - Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 10,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  version: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#95a5a6',
  },
});