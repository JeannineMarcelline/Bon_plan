import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {  // ← navigation retiré
  const { user, logout } = useAuth();
   const navigation = useNavigation();
   
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const getRoleLabel = (role) => {
    if (role === 'pro') return '🏢 Professionnel';
    if (role === 'admin') return '🔐 Administrateur';
    return '👤 Client';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>👤 Mon profil</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nom?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={20} color="#7f8c8d" />
              <View>
                <Text style={styles.infoLabel}>Nom</Text>
                <Text style={styles.infoValue}>{user?.nom || 'Non défini'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color="#7f8c8d" />
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Non défini'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#7f8c8d" />
              <View>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{user?.telephone || 'Non défini'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={20} color="#7f8c8d" />
              <View>
                <Text style={styles.infoLabel}>Rôle</Text>
                <Text style={styles.infoValue}>{getRoleLabel(user?.role)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bouton Ajouter une entreprise (seulement pour les Pro) */}
        {user?.role === 'pro' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // Navigation vers l'onglet Accueil puis AddCompany
              // Utilise le chemin complet
              navigation.navigate('Accueil', {
                screen: 'AddCompany',
              });
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter une entreprise</Text>
          </TouchableOpacity>
        )}

        {/* Bouton Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  version: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#95a5a6',
  },
});