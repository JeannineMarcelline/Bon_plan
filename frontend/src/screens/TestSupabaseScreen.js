import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import db from '../database/database';

export default function TestSupabaseScreen() {
  const [villes, setVilles] = useState([]);
  const [nom, setNom] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // ===== CHARGER LES VILLES DEPUIS SUPABASE =====
  const loadVilles = async () => {
    try {
      const { data, error } = await supabase
        .from('villes')
        .select('*')
        .order('nom');

      if (error) {
        console.error('❌ Erreur lecture:', error);
        Alert.alert('Erreur', error.message);
        return;
      }

      console.log('✅ Villes chargées:', data);
      setVilles(data || []);
    } catch (error) {
      console.error('❌ Erreur:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  // ===== AJOUTER UNE VILLE =====
  const addVille = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de ville');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('villes')
        .insert([{ nom: nom.trim(), region: region.trim() || null }])
        .select();

      if (error) {
        console.error('❌ Erreur insertion:', error);
        Alert.alert('Erreur', error.message);
        return;
      }

      console.log('✅ Ville ajoutée:', data);
      Alert.alert('✅ Succès', 'Ville ajoutée !');
      setNom('');
      setRegion('');
      loadVilles();
    } catch (error) {
      console.error('❌ Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== MODIFIER UNE VILLE =====
  const updateVille = async (id, ancienNom) => {
    Alert.prompt(
      'Modifier la ville',
      'Entrez le nouveau nom',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: async (nouveauNom) => {
            if (!nouveauNom || !nouveauNom.trim()) {
              Alert.alert('Erreur', 'Le nom est obligatoire');
              return;
            }
            try {
              const { error } = await supabase
                .from('villes')
                .update({ nom: nouveauNom.trim() })
                .eq('id', id);

              if (error) {
                console.error('❌ Erreur modification:', error);
                Alert.alert('Erreur', error.message);
                return;
              }

              Alert.alert('✅ Succès', 'Ville modifiée !');
              loadVilles();
            } catch (error) {
              console.error('❌ Erreur:', error);
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ],
      'plain-text',
      ancienNom
    );
  };

  // ===== SUPPRIMER UNE VILLE =====
  const deleteVille = async (id, nom) => {
    Alert.alert(
      'Confirmation',
      `Supprimer "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('villes')
                .delete()
                .eq('id', id);

              if (error) {
                console.error('❌ Erreur suppression:', error);
                Alert.alert('Erreur', error.message);
                return;
              }

              console.log('✅ Ville supprimée');
              loadVilles();
            } catch (error) {
              console.error('❌ Erreur:', error);
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  // ===== MIGRER LES DONNÉES DE SQLITE VERS SUPABASE =====
  const migrateData = async () => {
    setMigrating(true);
    try {
      // 1. Lire les données depuis SQLite
      const villes = await db.getAllAsync('SELECT * FROM villes');
      const categories = await db.getAllAsync('SELECT * FROM categories');
      const entreprises = await db.getAllAsync('SELECT * FROM entreprises');
      const vehicules = await db.getAllAsync('SELECT * FROM vehicules');
      const places = await db.getAllAsync('SELECT * FROM places');
      const reservations = await db.getAllAsync('SELECT * FROM reservation_transport');
      const avis = await db.getAllAsync('SELECT * FROM avis');

      console.log('📊 Données SQLite chargées');

      // 2. Compter les données
      const total = villes.length + categories.length + entreprises.length + 
                    vehicules.length + places.length + reservations.length + avis.length;
      
      Alert.alert('Migration en cours', `${total} éléments à migrer...`);

      // 3. Migrer les villes
      for (const ville of villes) {
        const { error } = await supabase
          .from('villes')
          .insert([{ nom: ville.nom, region: ville.region }]);
        if (error) console.error('❌ Erreur ville:', error);
      }

      // 4. Migrer les catégories
      for (const cat of categories) {
        const { error } = await supabase
          .from('categories')
          .insert([{ nom: cat.nom, description: cat.description }]);
        if (error) console.error('❌ Erreur catégorie:', error);
      }

      // 5. Migrer les entreprises
      for (const entreprise of entreprises) {
        const { error } = await supabase
          .from('entreprises')
          .insert([{
            nom: entreprise.nom,
            description: entreprise.description,
            adresse: entreprise.adresse,
            telephone: entreprise.telephone,
            logo: entreprise.logo,
            type_activite: entreprise.type_activite,
            statutvalidation: entreprise.statutvalidation,
            latitude: entreprise.latitude,
            longitude: entreprise.longitude,
          }]);
        if (error) console.error('❌ Erreur entreprise:', error);
      }

      // 6. Migrer les véhicules
      for (const vehicule of vehicules) {
        const { error } = await supabase
          .from('vehicules')
          .insert([{
            nom: vehicule.nom,
            type: vehicule.type,
            photo: vehicule.photo,
            capacite: vehicule.capacite,
            prix_place: vehicule.prix_place,
            ville_depart: vehicule.ville_depart,
            ville_arrivee: vehicule.ville_arrivee,
            date_depart: vehicule.date_depart,
            heure_depart: vehicule.heure_depart,
            places_cote_chauffeur: vehicule.places_cote_chauffeur,
          }]);
        if (error) console.error('❌ Erreur véhicule:', error);
      }

      // 7. Migrer les places
      for (const place of places) {
        const { error } = await supabase
          .from('places')
          .insert([{
            numero_place: place.numero_place,
            position: place.position,
            statut: place.statut,
          }]);
        if (error) console.error('❌ Erreur place:', error);
      }

      // 8. Migrer les réservations
      for (const reservation of reservations) {
        const { error } = await supabase
          .from('reservations_transport')
          .insert([{
            date_reservation: reservation.date_reservation,
            prix_total: reservation.prix_total,
            statut: reservation.statut,
          }]);
        if (error) console.error('❌ Erreur réservation:', error);
      }

      // 9. Migrer les avis
      for (const avisItem of avis) {
        const { error } = await supabase
          .from('avis')
          .insert([{
            note: avisItem.note,
            commentaire: avisItem.commentaire,
            date_avis: avisItem.date_avis,
          }]);
        if (error) console.error('❌ Erreur avis:', error);
      }

      Alert.alert('✅ Migration terminée', `Toutes les données ont été exportées vers Supabase (${total} éléments)`);
      loadVilles(); // Recharger la liste des villes
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setMigrating(false);
    }
  };

  // ===== CHARGER AU DÉMARRAGE =====
  useEffect(() => {
    loadVilles();
  }, []);

  // ===== RENDU =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Gestion des villes</Text>
        <Text style={styles.subtitle}>{villes.length} villes enregistrées</Text>
      </View>

      {/* Formulaire d'ajout */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nom de la ville *"
          placeholderTextColor="#999"
          value={nom}
          onChangeText={setNom}
        />
        <TextInput
          style={styles.input}
          placeholder="Région (optionnel)"
          placeholderTextColor="#999"
          value={region}
          onChangeText={setRegion}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={addVille}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? 'Ajout en cours...' : '➕ Ajouter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bouton de migration */}
      <TouchableOpacity
        style={styles.migrateButton}
        onPress={migrateData}
        disabled={migrating}
      >
        <Text style={styles.migrateButtonText}>
          {migrating ? 'Migration en cours...' : '☁️ Migrer toutes les données vers Supabase'}
        </Text>
      </TouchableOpacity>
<TouchableOpacity
  style={styles.deleteAllButton}
  onPress={async () => {
    Alert.alert(
      '⚠️ Attention',
      'Supprimer toutes les données SQLite ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await db.runAsync('DELETE FROM villes');
            await db.runAsync('DELETE FROM categories');
            await db.runAsync('DELETE FROM entreprises');
            await db.runAsync('DELETE FROM vehicules');
            await db.runAsync('DELETE FROM places');
            await db.runAsync('DELETE FROM reservation_transport');
            await db.runAsync('DELETE FROM avis');
            Alert.alert(' Succès', 'Toutes les données SQLite ont été supprimées');
          },
        },
      ]
    );
  }}
>
  <Text style={styles.deleteAllButtonText}>🗑️ Supprimer toutes les données SQLite</Text>
</TouchableOpacity>
      {/* Liste des villes */}
      <FlatList
        data={villes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.villeNom}>{item.nom}</Text>
              <Text style={styles.villeRegion}>
                {item.region || 'Région non définie'}
              </Text>
              <Text style={styles.villeId}>ID: {item.id}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => updateVille(item.id, item.nom)}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteVille(item.id, item.nom)}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune ville trouvée</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadVilles();
          setRefreshing(false);
        }}
      />
      
    </SafeAreaView>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  migrateButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  migrateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
  },
  villeNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  villeRegion: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  villeId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
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
  editButton: {
    backgroundColor: '#FEF3C7',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 16,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});