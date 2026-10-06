import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function PlacesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { idVehicule, idTrajet } = route.params;
  const { user } = useAuth();
  const [showRecap, setShowRecap] = useState(false);

  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState([]);
  const [vehicule, setVehicule] = useState(null);
  const [trajet, setTrajet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  const togglePlace = (place) => {
    const isSelected = selectedPlace.some((p) => p.id_place === place.id_place);
    if (isSelected) {
      setSelectedPlace(selectedPlace.filter((p) => p.id_place !== place.id_place));
    } else {
      setSelectedPlace([...selectedPlace, place]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: vehiculeData, error: vehiculeError } = await supabase
          .from('vehicules')
          .select('*')
          .eq('id_vehicule', idVehicule)
          .maybeSingle();

        if (vehiculeError) throw vehiculeError;
        if (vehiculeData) setVehicule(vehiculeData);

        const { data: trajetData, error: trajetError } = await supabase
          .from('trajets')
          .select('*')
          .eq('id_trajet', idTrajet)
          .maybeSingle();

        if (trajetError) throw trajetError;
        if (trajetData) setTrajet(trajetData);

        const { data: placesData, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('id_vehicule', idVehicule)
          .order('numero_place');
        if (placesError) throw placesError;
        setPlaces(placesData);
      } catch (error) {
        console.error('Erreur chargement places:', error);
        Alert.alert('Erreur', 'Impossible de charger les places');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [idVehicule, idTrajet]);

  const handleReservation = async () => {
    if (!selectedPlace.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une place');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour réserver');
      return;
    }
    setReserving(true);
    try {
      const idsPlacesSelectionnees = selectedPlace.map((p) => p.id_place);

      const { data: placesReservees, error: updateError } = await supabase
        .from('places')
        .update({ statut: 'reservee' })
        .in('id_place', idsPlacesSelectionnees)
        .eq('statut', 'disponible')
        .select();

      if (updateError) throw updateError;

      if (placesReservees.length < selectedPlace.length) {
        const idsRecuperees = placesReservees.map((p) => p.id_place);
        if (idsRecuperees.length > 0) {
          await supabase
            .from('places')
            .update({ statut: 'disponible' })
            .in('id_place', idsRecuperees);
        }
        Alert.alert(
          'Désolé',
          "Une ou plusieurs places viennent d'être réservées par quelqu'un d'autre. Merci de resélectionner."
        );
        setReserving(false);
        return;
      }

      const totalPrix = selectedPlace.length * vehicule.prix_place;

      const { data: reservation, error: reservationError } = await supabase
        .from('reservation_transport')
        .insert({
          id_utilisateur: user.id,
          id_trajet: idTrajet,
          date_reservation: new Date().toISOString().split('T')[0],
          prix_total: totalPrix,
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      const reservationPlaces = selectedPlace.map((place) => ({
        id_reservation: reservation.id_reservation,
        id_place: place.id_place,
      }));

      const { error: rpError } = await supabase
        .from('reservation_places')
        .insert(reservationPlaces);

      if (rpError) throw rpError;

      // Notifier le pro
      try {
        const { data: entrepriseData, error: entError } = await supabase
          .from('entreprises')
          .select('utilisateur_id')
          .eq('id', vehicule.id_entreprise)
          .maybeSingle();

        if (entError) {
          console.error('Erreur récup entreprise pour notif:', entError);
        } else if (entrepriseData?.utilisateur_id) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              utilisateur_id: entrepriseData.utilisateur_id,
              titre: 'Nouvelle réservation transport',
              message: `${trajet?.ville_depart} → ${trajet?.ville_arrivee} le ${trajet?.date_depart} — ${selectedPlace.length} place(s)`,
              lue: false,
            });

          if (notifError) {
            console.error('Erreur création notif pro:', notifError);
          }
        }
      } catch (notifErr) {
        console.error('Erreur notif (non bloquant):', notifErr);
      }

      Alert.alert(
        'Réservation confirmée!',
        `${selectedPlace.length} places réservée - Total : ${totalPrix} Ar`,
        [{ text: 'OK', onPress: () => navigation.navigate('MesReservations') }]
      );

      const { data: updatedPlaces, error: refreshError } = await supabase
        .from('places')
        .select('*')
        .eq('id_vehicule', idVehicule)
        .order('numero_place');

      if (refreshError) throw refreshError;
      setPlaces(updatedPlaces);
      setSelectedPlace([]);
    } catch (error) {
      console.error('Erreur réservation:', error);
      Alert.alert('Erreur', 'Impossible de réserver la place');
    } finally {
      setReserving(false);
    }
  };

  // ⭐ MODIF : Rendu du plan (grille épurée avec sièges clairs)
  const renderPlan = () => {
    const nbCoteChauffeur = vehicule?.places_cote_chauffeur || 0;

    const placesCoteChauffeur = places.filter(
      (p) => p.numero_place <= nbCoteChauffeur
    );
    const autresPlaces = places.filter((p) => p.numero_place > nbCoteChauffeur);

    const rows = [];

    // 1ère rangée : chauffeur + places côté chauffeur
    const firstRow = [];
    firstRow.push({ type: 'chauffeur', key: 'chauffeur' });
    placesCoteChauffeur.forEach((place) => {
      firstRow.push({ type: 'place', key: place.id_place, place });
    });
    rows.push(firstRow);

    // Rangées suivantes : 4 par 4
    for (let i = 0; i < autresPlaces.length; i += 4) {
      const group = autresPlaces.slice(i, i + 4);
      const row = group.map((place) => ({
        type: 'place',
        key: place.id_place,
        place,
      }));
      rows.push(row);
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.seatRow}>
        {row.map((item) => {
          if (item.type === 'chauffeur') {
            return (
              <View key="chauffeur" style={[styles.seat, styles.seatChauffeur]}>
                <Ionicons name="person" size={16} color="#9CA3AF" />
                <Text style={styles.seatChauffeurText}>Chauf.</Text>
              </View>
            );
          }

          const place = item.place;
          const isReserved = place.statut === 'reservee';
          const isSelected = selectedPlace.some(
            (p) => p.id_place === place.id_place
          );

          return (
            <TouchableOpacity
              key={place.id_place}
              style={[
                styles.seat,
                isReserved && styles.seatReserved,
                isSelected && styles.seatSelected,
                !isReserved && !isSelected && styles.seatAvailable,
              ]}
              onPress={() => {
                if (isReserved) {
                  Alert.alert('Place réservée', 'Cette place est déjà réservée');
                  return;
                }
                togglePlace(place);
              }}
              disabled={isReserved}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.seatNumber,
                  isSelected && styles.seatNumberSelected,
                  isReserved && styles.seatNumberReserved,
                ]}
              >
                {place.numero_place}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.title}>{vehicule?.nom || 'Véhicule'}</Text>
        </View>

        {/* ⭐ MODIF : CARTE INFO COMPACTE (sans emojis, avec Ionicons) */}
        {vehicule && trajet && (
          <View style={styles.infoCard}>
            <View style={styles.infoLeft}>
              <Text style={styles.infoRoute} numberOfLines={1}>
                {trajet.ville_depart?.trim()} → {trajet.ville_arrivee?.trim()}
              </Text>
              <View style={styles.infoMeta}>
                <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                <Text style={styles.infoMetaText}>
                  {new Date(trajet.date_depart).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  · {(trajet.heure_depart || '00:00').slice(0, 5)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRight}>
              <Text style={styles.infoPrice}>
                {Number(vehicule.prix_place).toLocaleString('fr-FR')} Ar
              </Text>
              <Text style={styles.infoPriceSub}>par place</Text>
            </View>
          </View>
        )}

        {/* ⭐ MODIF : TITRE SECTION */}
        <Text style={styles.sectionTitle}>Choisissez votre place</Text>

        {/* ⭐ MODIF : GRILLE ÉPURÉE */}
        <View style={styles.gridContainer}>{renderPlan()}</View>

        {/* ⭐ MODIF : LÉGENDE AVEC PASTILLES CERCLÉES */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotAvailable]} />
            <Text style={styles.legendText}>Libre</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotReserved]} />
            <Text style={styles.legendText}>Occupée</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotSelected]} />
            <Text style={styles.legendText}>Ma sélection</Text>
          </View>
        </View>
      </ScrollView>

      {/* ⭐ MODIF : BANDEAU BLEU FONCÉ EN BAS (apparaît seulement si sélection) */}
      {selectedPlace.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryCount} numberOfLines={1}>
              {selectedPlace.length} place
              {selectedPlace.length > 1 ? 's' : ''} · n°{' '}
              {selectedPlace
                .map((p) => p.numero_place)
                .sort((a, b) => a - b)
                .join(', ')}
            </Text>
            <Text style={styles.summaryTotal}>
              {(selectedPlace.length * vehicule.prix_place).toLocaleString(
                'fr-FR'
              )}{' '}
              Ar
            </Text>
          </View>
          <TouchableOpacity
            style={styles.summaryBtn}
            onPress={() => setShowRecap(true)}
            disabled={reserving}
            activeOpacity={0.85}
          >
            <Text style={styles.summaryBtnText}>Continuer</Text>
            <Ionicons name="chevron-forward" size={16} color="#1E3A5F" />
          </TouchableOpacity>
        </View>
      )}

      {/* MODALE RÉCAPITULATIF */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRecap}
        onRequestClose={() => setShowRecap(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recapContent}>
            <Text style={styles.recapTitle}>Récapitulatif</Text>

            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Véhicule</Text>
              <Text style={styles.recapValue}>{vehicule?.nom}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Trajet</Text>
              <Text style={styles.recapValue}>
                {trajet?.ville_depart?.trim()} → {trajet?.ville_arrivee?.trim()}
              </Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Date</Text>
              <Text style={styles.recapValue}>
                {new Date(trajet?.date_depart).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}{' '}
                à {(trajet?.heure_depart || '00:00').slice(0, 5)}
              </Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Places sélectionnées</Text>
              <Text style={styles.recapValue}>
                {selectedPlace
                  .map((p) => p.numero_place)
                  .sort((a, b) => a - b)
                  .join(', ')}
              </Text>
            </View>
            <View style={styles.recapDivider} />
            <View style={styles.recapRow}>
              <Text style={styles.recapLabelTotal}>Total</Text>
              <Text style={styles.recapValueTotal}>
                {(selectedPlace.length * vehicule?.prix_place).toLocaleString(
                  'fr-FR'
                )}{' '}
                Ar
              </Text>
            </View>

            <View style={styles.recapButtons}>
              <TouchableOpacity
                style={styles.recapCancelButton}
                onPress={() => setShowRecap(false)}
              >
                <Text style={styles.recapCancelText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recapConfirmButton}
                onPress={() => {
                  setShowRecap(false);
                  handleReservation();
                }}
                disabled={reserving}
              >
                <Text style={styles.recapConfirmText}>
                  {reserving ? 'Réservation...' : 'Confirmer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ---------- HEADER ----------
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },

  // ---------- CARTE INFO ----------
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoLeft: { flex: 1 },
  infoRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  infoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoMetaText: { fontSize: 11, color: '#6B7280' },
  infoRight: { alignItems: 'flex-end' },
  infoPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  infoPriceSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // ---------- SECTION ----------
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },

  // ---------- GRILLE ----------
  gridContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  seat: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  seatAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  seatReserved: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  seatSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  seatChauffeur: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    width: 62,
    gap: 2,
  },
  seatChauffeurText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  seatNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  seatNumberSelected: {
    color: '#fff',
  },
  seatNumberReserved: {
    color: '#991B1B',
  },

  // ---------- LÉGENDE ----------
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  legendDotAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  legendDotReserved: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  legendDotSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ---------- BANDEAU RÉCAP EN BAS ----------
  summaryBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    backgroundColor: '#1E3A5F',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryInfo: { flex: 1 },
  summaryCount: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  summaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A5F',
  },

  // ---------- MODALE RÉCAP ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  recapContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  recapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recapLabel: { fontSize: 14, color: '#6C757D' },
  recapValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  recapDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  recapLabelTotal: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
  recapValueTotal: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
  recapButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  recapCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  recapCancelText: { color: '#1A1A2E', fontWeight: '600' },
  recapConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
  },
  recapConfirmText: { color: '#fff', fontWeight: '600' },
});