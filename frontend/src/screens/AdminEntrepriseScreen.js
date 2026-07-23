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

  // Charger les entreprises
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

  // Valider ou refuser une entreprise
  const updateStatut = async (id, nouveauStatut, nom) => {
    const action = nouveauStatut === 'valide' ? 'valider' : 'refuser';
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment ${action} "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: action === 'valider' ? 'Valider' : 'Refuser',
          style: action === 'valider' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE entreprises SET statutValidation = ? WHERE id = ?',
                [nouveauStatut, id]
              );
              Alert.alert('✅ Succès', `Entreprise ${action === 'valider' ? 'validée' : 'refusée'} !`);
              loadEntreprises(); // Recharger la liste
            } catch (error) {
              console.error('Erreur mise à jour:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour');
            }
          },
        },
      ]
    );
  };

  // Couleur du statut
  const getStatutStyle = (statut) => {
    if (statut === 'valide') return styles.statutValide;
    if (statut === 'refuse') return styles.statutRefuse;
    return styles.statutEnAttente;
  };

  // Libellé du statut
  const getStatutLabel = (statut) => {
    if (statut === 'valide') return '✅ Validée';
    if (statut === 'refuse') return '❌ Refusée';
    return '⏳ En attente';
  };

  // Rendu d'une ligne
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
         <Text style={styles.cardTitle}>{item.id}</Text>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <Text style={styles.cardSubtitle}>👤 {item.proprietaire}</Text>
        <Text style={styles.cardSubtitle}>📍 {item.ville}</Text>
        <Text style={styles.cardSubtitle}>🏷️ {item.categorie}</Text>
        <Text style={[styles.statutBadge, getStatutStyle(item.statutValidation)]}>
          {getStatutLabel(item.statutValidation)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        {item.statutValidation === 'en_attente' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.validerButton]}
              onPress={() => updateStatut(item.id, 'valide', item.nom)}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.refuserButton]}
              onPress={() => updateStatut(item.id, 'refuse', item.nom)}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
        {item.statutValidation === 'valide' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.refuserButton]}
            onPress={() => updateStatut(item.id, 'refuse', item.nom)}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        {item.statutValidation === 'refuse' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.validerButton]}
            onPress={() => updateStatut(item.id, 'valide', item.nom)}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏢 Gestion des entreprises</Text>
        <Text style={styles.subtitle}>{entreprises.length} entreprises enregistrées</Text>
      </View>

      <FlatList
        data={entreprises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucune entreprise enregistrée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#95a5a6', marginTop: 2 },
  list: { paddingHorizontal: 15, paddingBottom: 20, paddingTop: 10 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  cardSubtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },
  statutBadge: { fontSize: 13, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  statutEnAttente: { backgroundColor: '#fff3cd', color: '#856404' },
  statutValide: { backgroundColor: '#d4edda', color: '#155724' },
  statutRefuse: { backgroundColor: '#f8d7da', color: '#721c24' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  validerButton: { backgroundColor: '#28a745' },
  refuserButton: { backgroundColor: '#dc3545' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#95a5a6', marginTop: 10 },
});