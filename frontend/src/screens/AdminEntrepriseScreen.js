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

export default function AdminEntrepriseScreen() {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les entreprises (NON MODIFIÉ)
  const loadEntreprises = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync(`
        SELECT e.*, u.nom as proprietaire, v.nom as ville, c.nom as categorie
        FROM entreprises e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN villes v ON e.ville_id = v.id
        LEFT JOIN categories c ON e.categorie_id = c.id
        WHERE u.id IS NOT NULL
        ORDER BY e.id DESC
      `);
      setEntreprises(result);
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      Alert.alert('Erreur', 'Impossible de charger les entreprises'); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntreprises();
  }, []);

  // Valider ou refuser une entreprise (NON MODIFIÉ - Garde la même logique)
  const updateStatut = async (id, nouveauStatut, nom) => {
    const action = nouveauStatut === 'valide' ? 'valider' : 'refuser';
    const actionLabel = nouveauStatut === 'valide' ? 'valider' : 'refuser';
    
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment ${actionLabel} "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: actionLabel === 'valider' ? 'Valider' : 'Refuser',
          style: actionLabel === 'valider' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE entreprises SET statutValidation = ? WHERE id = ?',
                [nouveauStatut, id]
              );
              const message = actionLabel === 'valider' 
                ? 'Entreprise validée et visible dans l\'app client !' 
                : 'Entreprise refusée, elle n\'apparaîtra pas dans l\'app client.';
              Alert.alert('✅ Succès', message);
              loadEntreprises();
            } catch (error) {
              console.error('Erreur mise à jour:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour');
            }
          },
        },
      ]
    );
  };

  // MODIFIE: Nouvelle fonction pour désactiver une entreprise validée
  const handleDesactiver = (id, nom) => {
    Alert.alert(
      'Désactiver l\'entreprise',
      `Voulez-vous vraiment désactiver "${nom}" ?\n\nElle ne sera plus visible dans l'app client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: () => updateStatut(id, 'refuse', nom),
        },
      ]
    );
  };

  // MODIFIE: Nouvelle fonction pour réactiver une entreprise refusée
  const handleReactive = (id, nom) => {
    Alert.alert(
      'Réactiver l\'entreprise',
      `Voulez-vous vraiment réactiver "${nom}" ?\n\nElle sera de nouveau visible dans l'app client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réactiver',
          onPress: () => updateStatut(id, 'valide', nom),
        },
      ]
    );
  };

  // MODIFIE: Couleur du statut
  const getStatutStyle = (statut) => {
    if (statut === 'valide') return styles.statutValide;
    if (statut === 'refuse') return styles.statutRefuse;
    return styles.statutEnAttente;
  };

  // MODIFIE: Libellé du statut
  const getStatutLabel = (statut) => {
    if (statut === 'valide') return 'Validée';
    if (statut === 'refuse') return 'Refusée';
    return 'En attente';
  };

  // MODIFIE: Rendu d'une ligne avec nouveaux boutons
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* LIGNE 1: Nom + Badge + Actions */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statutBadge, getStatutStyle(item.statutValidation)]}>
            <Text style={styles.statutText}>{getStatutLabel(item.statutValidation)}</Text>
          </View>
          
          {/* MODIFIE: Actions avec boutons textes selon le statut */}
          <View style={styles.cardActions}>
            {item.statutValidation === 'valide' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionDesactiver]}
                onPress={() => handleDesactiver(item.id, item.nom)}
              >
                <Ionicons name="ban-outline" size={16} color="#EA580C" />
                <Text style={styles.actionTextDesactiver}>Désactiver</Text>
              </TouchableOpacity>
            )}
            
            {item.statutValidation === 'en_attente' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionValider]}
                  onPress={() => updateStatut(item.id, 'valide', item.nom)}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#16A34A" />
                  <Text style={styles.actionTextValider}>Valider</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionRefuser]}
                  onPress={() => updateStatut(item.id, 'refuse', item.nom)}
                >
                  <Ionicons name="close-outline" size={16} color="#DC2626" />
                  <Text style={styles.actionTextRefuser}>Refuser</Text>
                </TouchableOpacity>
              </>
            )}
            
            {item.statutValidation === 'refuse' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionReactive]}
                onPress={() => handleReactive(item.id, item.nom)}
              >
                <Ionicons name="refresh-outline" size={16} color="#2563EB" />
                <Text style={styles.actionTextReactive}>Réactiver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* LIGNE 2: Infos en 1 ligne avec icônes Ionicons */}
      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.proprietaire}</Text>
        </View>
        <Text style={styles.infoSeparator}>|</Text>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.ville}</Text>
        </View>
        <Text style={styles.infoSeparator}>|</Text>
        <View style={styles.infoItem}>
          <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.categorie}</Text>
        </View>
      </View>

      {/* MODIFIE: Tooltip pour les entreprises refusées */}
      {item.statutValidation === 'refuse' && (
        <View style={styles.tooltipContainer}>
          <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
          <Text style={styles.tooltipText}>Ne s'affiche pas dans l'app client</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  // MODIFIE: Header avec icône Building2 (Ionicons)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="business-outline" size={28} color="#2563EB" />
          <Text style={styles.title}>Gestion des entreprises</Text>
        </View>
        <Text style={styles.subtitle}>{entreprises.length} entreprises enregistrées</Text>
      </View>

      <FlatList
        data={entreprises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune entreprise enregistrée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ===== STYLES REFONDUS =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // MODIFIE: Header avec icône et design épuré
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
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

  // MODIFIE: Card redesignée
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

  // LIGNE 1: Nom + Badge + Actions
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Badge statut (sans emoji)
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statutEnAttente: {
    backgroundColor: '#FEF3C7',
  },
  statutEnAttenteText: {
    color: '#92400E',
  },
  statutValide: {
    backgroundColor: '#D1FAE5',
  },
  statutValideText: {
    color: '#065F46',
  },
  statutRefuse: {
    backgroundColor: '#FEE2E2',
  },
  statutRefuseText: {
    color: '#991B1B',
  },

  // MODIFIE: Actions avec boutons textes
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  // Bouton Désactiver (pour Validée)
  actionDesactiver: {
    backgroundColor: '#FFF7ED', // orange-50
  },
  actionTextDesactiver: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EA580C', // orange-600
  },
  
  // Bouton Valider (pour En attente)
  actionValider: {
    backgroundColor: '#F0FDF4', // green-50
  },
  actionTextValider: {
    fontSize: 13,
    fontWeight: '500',
    color: '#16A34A', // green-600
  },
  
  // Bouton Refuser (pour En attente)
  actionRefuser: {
    backgroundColor: '#FEF2F2', // red-50
  },
  actionTextRefuser: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626', // red-600
  },
  
  // Bouton Réactiver (pour Refusée)
  actionReactive: {
    backgroundColor: '#EFF6FF', // blue-50
  },
  actionTextReactive: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB', // blue-600
  },

  // LIGNE 2: Infos en 1 ligne
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoSeparator: {
    fontSize: 14,
    color: '#D1D5DB',
    marginHorizontal: 4,
  },

  // MODIFIE: Tooltip pour les entreprises refusées
  tooltipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tooltipText: {
    fontSize: 12,
    color: '#9CA3AF',
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