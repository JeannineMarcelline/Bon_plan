import React, { useEffect, useState } from 'react';
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
import db from '../database/database';

export default function ProfileScreen() {  // ← navigation retiré
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [entreprise, setEntreprise] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(true);

  const loadEntreprise = async () => {
    if(user?.role !== 'pro'){
      setLoadingEntreprise(false);
      return;
    }
    try{
    const result = await db.getAllAsync('SELECT * FROM  entreprises WHERE utilisateur_id = ?',
      [user.id]
    );
    if(result.length > 0){
      setEntreprise(result[0]);
    }
    }catch(error){
     console.error('Erreur de chargement de entreprise:', error)
    }finally{
     setLoadingEntreprise(false);
    }
  }

  useEffect(() => {
    loadEntreprise();
  }, []);

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
  const getStatutLabel = (statut) => {
  if (statut === 'valide') return ' Validée';
  if (statut === 'refuse') return ' Refusée';
  return '⏳ En attente';
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
      <View style={styles.sectionCard}>
        
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
                style={styles.dashboardButton}
                onPress={() => navigation.navigate('ProDashboard')}
              >
                <Text style={styles.dashboardButtonText}>
                  📊 Accéder au Dashboard Pro
                </Text>
              </TouchableOpacity>
            )}
            
            {entreprise.statutValidation === 'en_attente' && (
              <View style={styles.attenteContainer}>
                <Ionicons name="hourglass-outline" size={24} color="#ffc107" />
                <Text style={styles.attenteText}>
                  ⏳ Votre entreprise est en attente de validation par l'administrateur.
                </Text>
              </View>
            )}
            
            {entreprise.statutValidation === 'refuse' && (
              <View style={styles.refuseContainer}>
                <Ionicons name="close-circle-outline" size={24} color="#e74c3c" />
                <Text style={styles.refuseText}>
                  ❌ Votre entreprise a été refusée. Veuillez contacter l'administrateur.
                </Text>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Accueil', { screen: 'AddCompany' })}
          >
            <Text style={styles.addButtonText}>
              ➕ Ajouter mon entreprise
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  sectionCard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
sectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: 8,
},
entrepriseNom: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2c3e50',
},
entrepriseStatut: {
  fontSize: 14,
  color: '#7f8c8d',
  marginTop: 4,
  marginBottom: 8,
},
dashboardButton: {
  backgroundColor: '#007BFF',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 16,
  alignItems: 'center',
  marginTop: 8,
},
dashboardButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
},
attenteContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff3cd',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
  gap: 8,
},
attenteText: {
  flex: 1,
  color: '#856404',
  fontSize: 14,
},
refuseContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f8d7da',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
  gap: 8,
},
refuseText: {
  flex: 1,
  color: '#721c24',
  fontSize: 14,
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
loadingText: {
  color: '#95a5a6',
  fontSize: 14,
  textAlign: 'center',
  paddingVertical: 10,
},
});