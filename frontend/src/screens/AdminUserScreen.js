import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== CHARGER LES UTILISATEURS (NON MODIFIÉ) =====
  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync(
        'SELECT id, nom, email, role, statut, telephone FROM utilisateurs ORDER BY id'
      );
      setUsers(result);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ===== BLOQUER / DÉBLOQUER UN UTILISATEUR (NON MODIFIÉ) =====
  const toggleBlockUser = async (id, nom, statutActuel) => {
    const nouveauStatut = statutActuel === 'actif' ? 'suspendu' : 'actif';
    const action = nouveauStatut === 'suspendu' ? 'bloquer' : 'débloquer';

    Alert.alert(
      `⚠️ Confirmation`,
      `Voulez-vous vraiment ${action} l'utilisateur "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: action === 'bloquer' ? 'Bloquer' : 'Débloquer',
          style: action === 'bloquer' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE utilisateurs SET statut = ? WHERE id = ?',
                [nouveauStatut, id]
              );
              Alert.alert('Succès', `Utilisateur ${action === 'bloquer' ? 'bloqué' : 'débloqué'} !`);
              loadUsers();
            } catch (error) {
              console.error('Erreur blocage:', error);
              Alert.alert('Erreur', `Impossible de ${action} l'utilisateur`);
            }
          },
        },
      ]
    );
  };

  // ===== SUPPRIMER UN UTILISATEUR (NON MODIFIÉ) =====
  const deleteUser = (id, nom) => {
    Alert.alert(
      '⚠️ Confirmation',
      `Voulez-vous vraiment supprimer définitivement "${nom}" ?\n\n⚠️ Attention : cette action est irréversible et supprimera toutes ses données associées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM utilisateurs WHERE id = ?', [id]);
              Alert.alert('✅ Succès', 'Utilisateur supprimé !');
              loadUsers();
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
            }
          },
        },
      ]
    );
  };

  // MODIFIE: Rôle avec icône (sans emoji)
  const getRoleIcon = (role) => {
    if (role === 'admin') return 'shield-checkmark-outline';
    if (role === 'pro') return 'briefcase-outline';
    return 'person-outline';
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Admin';
    if (role === 'pro') return 'Professionnel';
    return 'Client';
  };

  // MODIFIE: Couleur du statut (sans emoji)
  const getStatutStyle = (statut) => {
    return statut === 'actif' ? styles.statutActif : styles.statutSuspendu;
  };

  const getStatutLabel = (statut) => {
    return statut === 'actif' ? 'Actif' : 'Bloqué';
  };

  // MODIFIE: RENDU D'UNE LIGNE - Même structure que la page Entreprises
  const renderItem = ({ item }) => {
    const isAdmin = item.role === 'admin';
    const isBlocked = item.statut === 'suspendu';

    return (
      <View style={styles.card}>
        {/* LIGNE 1: Nom + Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.nom}</Text>
            <View style={[styles.statutBadge, getStatutStyle(item.statut)]}>
              <Text style={styles.statutText}>{getStatutLabel(item.statut)}</Text>
            </View>
          </View>
          
          {/* COLONNE DROITE - Actions */}
          <View style={styles.headerRight}>
            {!isAdmin ? (
              <View style={styles.cardActions}>
                {!isBlocked ? (
                  // Si Actif → Bouton Bloquer
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionBlock]}
                    onPress={() => toggleBlockUser(item.id, item.nom, item.statut)}
                  >
                    <Ionicons name="ban-outline" size={14} color="#EA580C" />
                    <Text style={styles.actionTextBlock}>Bloquer</Text>
                  </TouchableOpacity>
                ) : (
                  // Si Bloqué → Bouton Débloquer
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionUnblock]}
                    onPress={() => toggleBlockUser(item.id, item.nom, item.statut)}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#16A34A" />
                    <Text style={styles.actionTextUnblock}>Débloquer</Text>
                  </TouchableOpacity>
                )}
                
                {/* Bouton Supprimer */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDelete]}
                  onPress={() => deleteUser(item.id, item.nom)}
                >
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={styles.actionTextDelete}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Cas spécial Admin
              <View style={styles.protectedBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />
                <Text style={styles.protectedText}>Compte protégé</Text>
              </View>
            )}
          </View>
        </View>

        {/* LIGNE 2: Email avec truncate */}
        <View style={styles.cardInfo}>
          <Ionicons name="mail-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>{item.email}</Text>
        </View>

        {/* LIGNE 3: Rôle avec icône */}
        <View style={styles.cardInfo}>
          <Ionicons name={getRoleIcon(item.role)} size={14} color="#6B7280" />
          <Text style={styles.infoText}>{getRoleLabel(item.role)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  // MODIFIE: Header avec icône Users
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="people-outline" size={28} color="#2563EB" />
            <Text style={styles.title}>Gestion des utilisateurs</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{users.length} utilisateurs enregistrés</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun utilisateur enregistré</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ===== STYLES - MÊME STRUCTURE QUE LA PAGE ENTREPRISES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 40,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },

  // Card - Même style que la page Entreprises
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  // LIGNE 1: Nom + Badge à gauche, Actions à droite
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },

  // Badge statut
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statutActif: {
    backgroundColor: '#D1FAE5',
  },
  statutActifText: {
    color: '#065F46',
  },
  statutSuspendu: {
    backgroundColor: '#FEE2E2',
  },
  statutSuspenduText: {
    color: '#991B1B',
  },

  // COLONNE DROITE - Actions
  headerRight: {
    flexShrink: 0,
    marginLeft: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  // Boutons - Petits (px-2.5 py-1.5)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  // Bouton Bloquer (orange)
  actionBlock: {
    backgroundColor: '#FFF7ED',
  },
  actionTextBlock: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EA580C',
  },
  
  // Bouton Débloquer (vert)
  actionUnblock: {
    backgroundColor: '#F0FDF4',
  },
  actionTextUnblock: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16A34A',
  },
  
  // Bouton Supprimer (rouge)
  actionDelete: {
    backgroundColor: '#FEF2F2',
  },
  actionTextDelete: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },

  // Cas spécial Admin
  protectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  protectedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // LIGNES D'INFOS (Email + Rôle)
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});