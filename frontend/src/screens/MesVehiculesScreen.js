import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function MesVehiculesScreen({ navigation }) {
  const { user } = useAuth();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVehicules = async () => {
    try {
      const { data: entreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('id')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (entrepriseError) throw entrepriseError;

      if (!entreprise) {
        setVehicules([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vehicules')
        .select('*, places (id_place), trajets (*)')
        .eq('id_entreprise', entreprise.id)
        .order('id_vehicule', { ascending: false });

      if (error) throw error;

      const vehiculesAvecStats = await Promise.all(
        (data || []).map(async (v) => {
          const trajetsIds = (v.trajets || []).map((t) => t.id_trajet);

          let nbReservations = 0;
          if (trajetsIds.length > 0) {
            const { count } = await supabase
              .from('reservation_transport')
              .select('*', { count: 'exact', head: true })
              .in('id_trajet', trajetsIds);

            nbReservations = count || 0;
          }

          return {
            ...v,
            nb_places: (v.places || []).length,
            nb_reservations: nbReservations,
            trajets: v.trajets || [],
          };
        })
      );

      setVehicules(vehiculesAvecStats);
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

  const deleteVehicule = async (id, nom) => {
    try {
      const { data: trajetsVehicule, error: trajetsError } = await supabase
        .from('trajets')
        .select('id_trajet')
        .eq('id_vehicule', id);

      if (trajetsError) throw trajetsError;

      const trajetsIds = (trajetsVehicule || []).map((t) => t.id_trajet);

      let nbReservations = 0;
      if (trajetsIds.length > 0) {
        const { count, error: countError } = await supabase
          .from('reservation_transport')
          .select('*', { count: 'exact', head: true })
          .in('id_trajet', trajetsIds)
          .in('statut', ['en_attente', 'confirmee']);

        if (countError) throw countError;
        nbReservations = count || 0;
      }

      if (nbReservations > 0) {
        Alert.alert(
          'Suppression impossible',
          `Ce véhicule a ${nbReservations} réservation(s) en cours. Vous ne pouvez pas le supprimer.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert('Confirmation', `Voulez-vous vraiment supprimer "${nom}" ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: placesError } = await supabase
                .from('places')
                .delete()
                .eq('id_vehicule', id);
              if (placesError) throw placesError;

              const { error: trajetsDelError } = await supabase
                .from('trajets')
                .delete()
                .eq('id_vehicule', id);
              if (trajetsDelError) throw trajetsDelError;

              const { error: vehiculeError } = await supabase
                .from('vehicules')
                .delete()
                .eq('id_vehicule', id);
              if (vehiculeError) throw vehiculeError;

              Alert.alert('Succès', 'Véhicule supprimé');
              loadVehicules();
            } catch (error) {
              console.error('Erreur de suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Erreur vérification réservations:', error);
      Alert.alert('Erreur', 'Impossible de vérifier les réservations');
    }
  };

  // NOUVEAU : gère la suppression/désactivation d'UN SEUL trajet (pas tout le véhicule)
  const handleTrajetAction = async (trajet) => {
    try {
      // On vérifie si CE trajet précis a déjà des réservations
      const { count, error: countError } = await supabase
        .from('reservation_transport')
        .select('*', { count: 'exact', head: true })
        .eq('id_trajet', trajet.id_trajet);

      if (countError) throw countError;

      const aDesReservations = (count || 0) > 0;

      if (aDesReservations) {
        // NOUVEAU : trajet déjà réservé au moins une fois -> jamais de vraie
        // suppression, on le désactive seulement (statut = 'annule')
        Alert.alert(
          'Annuler ce trajet ?',
          'Ce trajet a déjà des réservations, il ne peut pas être supprimé. Vous pouvez seulement l\'annuler (il restera visible dans l\'historique).',
          [
            { text: 'Retour', style: 'cancel' },
            {
              text: 'Annuler le trajet',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('trajets')
                  .update({ statut: 'annule' })
                  .eq('id_trajet', trajet.id_trajet);
                if (error) {
                  console.error('Erreur annulation trajet:', error);
                  Alert.alert('Erreur', 'Impossible d\'annuler le trajet');
                  return;
                }
                Alert.alert('Succès', 'Trajet annulé');
                loadVehicules();
              },
            },
          ]
        );
      } else {
        // NOUVEAU : aucune réservation -> suppression réelle possible
        Alert.alert(
          'Supprimer ce trajet ?',
          `${trajet.ville_depart} → ${trajet.ville_arrivee}, aucune réservation en cours.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('trajets')
                  .delete()
                  .eq('id_trajet', trajet.id_trajet);
                if (error) {
                  console.error('Erreur suppression trajet:', error);
                  Alert.alert('Erreur', 'Impossible de supprimer le trajet');
                  return;
                }
                Alert.alert('Succès', 'Trajet supprimé');
                loadVehicules();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur vérification trajet:', error);
      Alert.alert('Erreur', 'Impossible de vérifier ce trajet');
    }
  };

  const renderVehicule = ({ item }) => (
    <View style={styles.card}>
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

      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.infoLabel}>Prix/place :</Text>
          <Text style={styles.infoValue}>{item.prix_place || item.prix} Ar</Text>
          <Ionicons
            name="people-outline"
            size={16}
            color="#6B7280"
            style={styles.infoIconSpacing}
          />
          <Text style={styles.infoLabel}>Places :</Text>
          <Text style={styles.infoValue}>{item.capacite || 0}</Text>
        </View>
      </View>

      <View style={styles.trajetsSection}>
        <View style={styles.trajetsHeader}>
          <Text style={styles.trajetsTitle}>Trajets ({item.trajets.length})</Text>
        </View>

        {item.trajets.length === 0 ? (
          <Text style={styles.noTrajetText}>Aucun trajet pour ce véhicule</Text>
        ) : (
          item.trajets.map((trajet) => (
            // MODIFIÉ : trajetItem devient cliquable (bouton supprimer en plus),
            // et son style change légèrement si le trajet est annulé
            <View
              key={trajet.id_trajet}
              style={[
                styles.trajetItem,
                trajet.statut === 'annule' && styles.trajetItemAnnule,
              ]}
            >
              <View style={styles.trajetInfo}>
                <View style={styles.trajetLine}>
                  <Ionicons name="map-outline" size={14} color="#2563EB" />
                  <Text style={styles.trajetText}>
                    {trajet.ville_depart} → {trajet.ville_arrivee}
                  </Text>
                  {/* NOUVEAU : badge visuel si le trajet est annulé */}
                  {trajet.statut === 'annule' && (
                    <View style={styles.trajetBadgeAnnule}>
                      <Text style={styles.trajetBadgeAnnuleText}>Annulé</Text>
                    </View>
                  )}
                </View>
                <View style={styles.trajetLine}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.trajetSubText}>
                    {trajet.date_depart} à {trajet.heure_depart}
                  </Text>
                </View>
              </View>
              {/* NOUVEAU : bouton pour supprimer/annuler ce trajet précis */}
              {trajet.statut !== 'annule' && (
                <TouchableOpacity
                  style={styles.trajetDeleteButton}
                  onPress={() => handleTrajetAction(trajet)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addTrajetButton}
          onPress={() =>
            navigation.navigate('AddTrajet', { vehiculeId: item.id_vehicule })
          }
        >
          <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.addTrajetButtonText}>Ajouter un trajet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() =>
            navigation.navigate('EditVehicule', { id: item.id_vehicule })
          }
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  list: { padding: 16, paddingBottom: 40 },

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

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  imageContainer: { marginRight: 12 },
  image: { width: 60, height: 60, borderRadius: 10 },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  nom: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  typeText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },

  infoGrid: { marginBottom: 12 },
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
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
  infoIconSpacing: { marginLeft: 12 },

  trajetsSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trajetsHeader: { marginBottom: 8 },
  trajetsTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  noTrajetText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  // MODIFIÉ : trajetItem passe en flexDirection row pour accueillir le bouton supprimer
  trajetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  // NOUVEAU : style grisé pour un trajet annulé
  trajetItemAnnule: {
    opacity: 0.5,
  },
  // NOUVEAU : conteneur des infos du trajet (pour laisser la place au bouton à droite)
  trajetInfo: {
    flex: 1,
  },
  trajetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  trajetText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  trajetSubText: { fontSize: 12, color: '#6B7280' },
  // NOUVEAU : badge "Annulé"
  trajetBadgeAnnule: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  trajetBadgeAnnuleText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
  // NOUVEAU : bouton supprimer un trajet précis
  trajetDeleteButton: {
    padding: 8,
  },
  addTrajetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addTrajetButtonText: { fontSize: 13, color: '#2563EB', fontWeight: '500' },

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
  editButton: { backgroundColor: '#EFF6FF' },
  deleteButton: { backgroundColor: '#FEF2F2' },
  actionText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  actionTextDelete: { color: '#EF4444' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
});