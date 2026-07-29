import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import db from '../database/database';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [entreprise, setEntreprise] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(true);

  // === TOUTE LA LOGIQUE RESTE IDENTIQUE ===
  const loadEntreprise = async () => {
    if (user?.role !== 'pro') {
      setLoadingEntreprise(false);
      return;
    }
    try {
      const result = await db.getAllAsync('SELECT * FROM entreprises WHERE utilisateur_id = ?', [user.id]);
      if (result.length > 0) {
        setEntreprise(result[0]);
      }
    } catch (error) {
      console.error('Erreur de chargement de entreprise:', error);
    } finally {
      setLoadingEntreprise(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadEntreprise();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: async () => { await logout(); } },
      ]
    );
  };

  const getRoleLabel = (role) => {
    if (role === 'pro') return 'Professionnel';
    if (role === 'admin') return 'Administrateur';
    return 'Client';
  };

  const getStatutLabel = (statut) => {
    if (statut === 'valide') return '✅ Validée';
    if (statut === 'refuse') return '❌ Refusée';
    return '⏳ En attente';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ===== EN-TÊTE ===== */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nom?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.nom || 'Utilisateur'}</Text>
            <Text style={styles.userRole}>{getRoleLabel(user?.role)}</Text>
          </View>
        </View>

        {/* ===== CARTE DES INFOS ===== */}
        <View style={styles.card}>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#1E3A5F" />
            <View>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user?.nom || 'Non défini'}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#1E3A5F" />
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Non défini'}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#1E3A5F" />
            <View>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.telephone || 'Non défini'}</Text>
            </View>
          </View>
        </View>

        {/* ===== SECTION ENTREPRISE (PRO) ===== */}
        {user?.role === 'pro' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏢 Mon entreprise</Text>
            {loadingEntreprise ? (
              <Text style={styles.loadingText}>Chargement...</Text>
            ) : entreprise ? (
              <>
                <Text style={styles.entrepriseNom}>{entreprise.nom}</Text>
                <Text style={styles.entrepriseStatut}>
                  Statut : {getStatutLabel(entreprise.statutValidation)}
                </Text>
                {entreprise.statutValidation === 'valide' && (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('Accueil', { screen: 'ProDashbord' })}
                  >
                    <Text style={styles.primaryButtonText}>📊 Dashboard Pro</Text>
                  </TouchableOpacity>
                )}
                {entreprise.statutValidation === 'en_attente' && (
                  <View style={styles.pendingBox}>
                    <Text style={styles.pendingText}>⏳ En attente de validation</Text>
                  </View>
                )}
                {entreprise.statutValidation === 'refuse' && (
                  <View style={styles.refusedBox}>
                    <Text style={styles.refusedText}>❌ Refusée</Text>
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Accueil', { screen: 'AddCompany' })}
              >
                <Text style={styles.secondaryButtonText}>➕ Ajouter mon entreprise</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ===== MES RÉSERVATIONS ===== */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Accueil', { screen: 'MesReservations' })}
        >
          <Ionicons name="calendar-outline" size={24} color="#1E3A5F" />
          <Text style={styles.menuCardText}>Mes réservations</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* ===== DÉCONNEXION ===== */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Bon Plan Madagascar v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== STYLES MODERNES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginTop: 12,
  },
  userRole: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6C757D',
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  entrepriseNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  entrepriseStatut: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#E9ECEF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#1E3A5F',
    fontWeight: '600',
    fontSize: 14,
  },
  pendingBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  pendingText: {
    color: '#856404',
    fontSize: 14,
  },
  refusedBox: {
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  refusedText: {
    color: '#721C24',
    fontSize: 14,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuCardText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    color: '#6C757D',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  version: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#ADB5BD',
  },
});