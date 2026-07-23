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

  // ===== CHARGER LES UTILISATEURS =====
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

  // ===== BLOQUER / DÉBLOQUER UN UTILISATEUR =====
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

  // ===== SUPPRIMER UN UTILISATEUR =====
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
              Alert.alert(' Succès', 'Utilisateur supprimé !');
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

  // ===== RENDU D'UNE LIGNE =====
  const renderItem = ({ item }) => {
    const getRoleLabel = (role) => {
      if (role === 'admin') return '👑 Admin';
      if (role === 'pro') return '🏢 Professionnel';
      return '👤 Client';
    };

    const getStatutStyle = (statut) => {
      return statut === 'actif' ? styles.statutActif : styles.statutSuspendu;
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.nom}</Text>
          <Text style={styles.cardEmail}>📧 {item.email}</Text>
          <Text style={styles.cardRole}>{getRoleLabel(item.role)}</Text>
          <View style={styles.cardStatutContainer}>
            <Text style={[styles.cardStatut, getStatutStyle(item.statut)]}>
              {item.statut === 'actif' ? 'Actif' : '🔒 Suspendu'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {/* Bouton Bloquer/Débloquer */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.statut === 'actif' ? styles.blockButton : styles.unblockButton,
            ]}
            onPress={() => toggleBlockUser(item.id, item.nom, item.statut)}
          >
            <Ionicons
              name={item.statut === 'actif' ? 'lock-closed' : 'lock-open'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Bouton Supprimer (ne pas supprimer l'Admin lui-même) */}
          {item.role !== 'admin' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteUser(item.id, item.nom)}
            >
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>👤 Gestion des utilisateurs</Text>
        <Text style={styles.subtitle}>{users.length} utilisateurs enregistrés</Text>
      </View>

      {/* Liste */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucun utilisateur enregistré</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  cardRole: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 2,
  },
  cardStatutContainer: {
    marginTop: 4,
  },
  cardStatut: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  statutActif: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statutSuspendu: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockButton: {
    backgroundColor: '#e74c3c',
  },
  unblockButton: {
    backgroundColor: '#28a745',
  },
  deleteButton: {
    backgroundColor: '#6c757d',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
  },
});
