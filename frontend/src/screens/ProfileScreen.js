// screens/ProfileScreen.js
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
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [entreprise, setEntreprise] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(true);



  const loadEntreprise = async () => {
    if (user?.role !== 'pro') {
      setLoadingEntreprise(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEntreprise(data);
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
    if (statut === 'valide') return ' Validée';
    if (statut === 'refuse') return ' Refusée';
    return ' En attente';
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
 
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

        
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => navigation.navigate('Accueil', { screen: 'ClientOrders' })}
          >
            <Ionicons name="cube-outline" size={22} color="#2563EB" />
            <Text style={styles.quickButtonText}>Commandes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => navigation.navigate('Accueil', { screen: 'MesReservations' })}
          >
            <Ionicons name="bus-outline" size={22} color="#7C3AED" />
            <Text style={styles.quickButtonText}>Réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => navigation.navigate('Favoris')}
          >
            <Ionicons name="heart-outline" size={22} color="#DC2626" />
            <Text style={styles.quickButtonText}>Favoris</Text>
          </TouchableOpacity>
        </View>

       

        {user?.role === 'pro' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏢 Mon entreprise</Text>
            {loadingEntreprise ? (
              <Text style={styles.loadingText}>Chargement...</Text>
            ) : entreprise ? (
              <>
                <Text style={styles.entrepriseNom}>{entreprise.nom}</Text>
                <Text style={styles.entrepriseStatut}>
                  Statut : {getStatutLabel(entreprise.statutvalidation)}
                </Text>
                {entreprise.statutvalidation === 'valide' && (
                  <>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => navigation.navigate('Accueil', { screen: 'ProDashbord' })}
                    >
                      <Text style={styles.primaryButtonText}> Dashboard Pro</Text>
                    </TouchableOpacity>
                  </>
                )}
                {entreprise.statutvalidation === 'en_attente' && (
                  <View style={styles.pendingBox}>
                    <Text style={styles.pendingText}> En attente de validation</Text>
                  </View>
                )}
                {entreprise.statutvalidation === 'refuse' && (
                  <View style={styles.refusedBox}>
                    <Text style={styles.refusedText}> Refusée</Text>
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

        
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate('AdminDashbord')}
          >
            <Ionicons name="shield-outline" size={22} color="#fff" />
            <Text style={styles.adminButtonText}>🛡️ Administration</Text>
          </TouchableOpacity>
        )}

       
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC3545" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Bon Plan Madagascar v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}



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

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    gap: 4,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },

  
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  notifIconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  notifSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
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
  loadingText: {
    color: '#6C757D',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },


  adminButton: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },


  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 8,
    gap: 8,
  },
  logoutButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: '500',
  },


  version: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#ADB5BD',
  },
});