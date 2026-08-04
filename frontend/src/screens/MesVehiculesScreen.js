import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';

export default function MesVehiculesScreen({ navigation }) {
  const { user } = useAuth();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVehicules = async () => {
    try {
      const entreprises = await db.getAllAsync('SELECT id FROM entreprises WHERE utilisateur_id = ?', [user.id]);

      if (entreprises.length === 0) {
        setVehicules([]);
        setLoading(false);
        return;
      }

      const idEntreprises = entreprises[0].id;

      const result = await db.getAllAsync(`
        SELECT v.*, 
        (SELECT COUNT(*) FROM places WHERE places.id_vehicule = v.id_vehicule) as nb_places,
        (SELECT COUNT(*) FROM reservation_transport WHERE id_vehicule = v.id_vehicule) as nb_reservations
        FROM vehicules v
        WHERE v.id_entreprise = ?
        ORDER BY v.id_vehicule DESC`, [idEntreprises]);
      setVehicules(result);
    } catch (error) {
      console.error('Erreur de chargement de véhicule', error);
      Alert.alert('Erreur', 'Impossible de charger les véhicules');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVehicules();
    }, [])
  );

  const deleteVehicule = (id, nom) => {
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment supprimer "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM places WHERE id_vehicules = ?', [id]);
              await db.runAsync('DELETE FROM vehicules WHERE id_vehicules = ?', [id]);
              Alert.alert('Succès', 'Véhicule supprimé');
              loadVehicules();
            } catch (error) {
              console.error('Erreur de suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  // MODIFIE: Nouveau design de carte avec labels
  const renderVehicule = ({ item }) => (
    <View style={styles.card}>
      {/* Image + Titre */}
      <View style={styles.cardHeader}>
        <View style={styles.imageContainer}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="car-outline" size={28} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.nom}>{item.nom}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
      </View>

      {/* Grille d'informations */}
      <View style={styles.infoGrid}>
        {/* Ligne 1: Trajet */}
        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={16} color="#6B7280" />
          <Text style={styles.infoLabel}>Trajet : </Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.ville_depart} → {item.ville_arrivee}</Text>
        </View>

        {/* Ligne 2: Date + Heure */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.infoLabel}>Date de départ :</Text>
          <Text style={styles.infoValue}>{item.date_depart}</Text>
          <Ionicons name="time-outline" size={16} color="#6B7280" style={styles.infoIconSpacing} />
          <Text style={styles.infoLabel}>Heure :</Text>
          <Text style={styles.infoValue}>{item.heure_depart}</Text>
        </View>

        {/* Ligne 3: Prix + Places */}
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.infoLabel}>Prix/place :</Text>
          <Text style={styles.infoValue}>{item.prix_place || item.prix} Ar</Text>
          <Ionicons name="people-outline" size={16} color="#6B7280" style={styles.infoIconSpacing} />
          <Text style={styles.infoLabel}>Places :</Text>
          <Text style={styles.infoValue}>{item.nb_places || 0}</Text>

           <Text style={styles.infoLabel}>Places a cote du chauffeur :</Text>
          <Text style={styles.infoValue}>{item.places_cote_chauffeur || 0}</Text>
        </View>

        {/* Ligne 4: Réservations */}
        <View style={styles.infoRow}>
          <Ionicons name="bookmark-outline" size={16} color="#6B7280" />
          <Text style={styles.infoLabel}>Réservations : </Text>
          <Text style={styles.infoValue}>{item.nb_reservations || 0}</Text>
        </View>
      </View>


      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditVehicule', { id: item.id_vehicule })}
        >
          <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          <Text style={styles.actionText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteVehicule(item.id_vehicule, item.nom)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.actionTextDelete]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes véhicules</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddVehicle')}>
          <Ionicons name="add-circle" size={28} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {vehicules.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun véhicule</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddVehicle')}
          >
            <Text style={styles.addButtonText}>Ajouter un véhicule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicules}
          keyExtractor={(item) => item.id_vehicule.toString()}
          renderItem={renderVehicule}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },

  // CARD
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

  // HEADER CARD
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  typeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },

  // INFOS
  infoGrid: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    marginRight: 6,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  infoIconSpacing: {
    marginLeft: 12,
  },

  // ACTIONS
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  actionTextDelete: {
    color: '#EF4444',
  },

  // EMPTY
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});