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
  const { idVehicule } = route.params;
  const { user } = useAuth();
  const [showRecap, setShowRecap] = useState(false);

  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState([]);
  const [vehicule, setVehicule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  const togglePlace = (place) => {
    const isSelected = selectedPlace.some(p => p.id_place === place.id_place);
    if(isSelected){
      setSelectedPlace(selectedPlace.filter(p => p.id_place !== place.id_place));
    }else{
      setSelectedPlace([...selectedPlace, place]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const {data: vehiculeData, error: vehiculeError} = await supabase
        .from('vehicules')
        .select('*')
        .eq('id_vehicule', idVehicule)
        .maybeSingle();

        if(vehiculeError) throw vehiculeError;
        if(vehiculeData) {
          setVehicule(vehiculeData);
        }
        const {data: placesData, error: placesError} = await supabase
        .from('places')
        .select('*')
        .eq('id_vehicule', idVehicule)
        .order('numero_place');
        if(placesError) throw placesError;
        setPlaces(placesData)
      } catch (error) {
        console.error('Erreur chargement places:', error);
        Alert.alert('Erreur', 'Impossible de charger les places');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [idVehicule]);

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
      try {
  const idsPlacesSelectionnees = selectedPlace.map((p) => p.id_place);

  // 1. Vérification + réservation en une seule requête atomique
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
    Alert.alert('Désolé', 'Une ou plusieurs places viennent d\'être réservées par quelqu\'un d\'autre. Merci de resélectionner.');
    setReserving(false);
    return;
  }

  // 2. Calcul du prix total (inchangé)
  const totalPrix = selectedPlace.length * vehicule.prix_place;

  // 3. Créer la réservation (déjà adapté précédemment)
  const { data: reservation, error: reservationError } = await supabase
    .from('reservation_transport')
    .insert({
      id_utilisateur: user.id,
      id_vehicule: idVehicule,
      date_reservation: new Date().toISOString().split('T')[0],
      prix_total: totalPrix,
    })
    .select()
    .single();

  if (reservationError) throw reservationError;

  // 4. Lier les places à cette réservation (déjà adapté précédemment)
  const reservationPlaces = selectedPlace.map((place) => ({
    id_reservation: reservation.id_reservation,
    id_place: place.id_place,
  }));

  const { error: rpError } = await supabase
    .from('reservation_places')
    .insert(reservationPlaces);

  if (rpError) throw rpError;

  

  Alert.alert(
    'Réservation confirmée!',
    `${selectedPlace.length} places réservée - Total : ${totalPrix} Ar`,
    [{ text: 'OK', onPress: () => navigation.navigate('MesReservations') }]
  );

  // 5. Rafraîchir les places (déjà adapté précédemment)
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
    } catch (error) {
      console.error('Erreur réservation:', error);
      Alert.alert('Erreur', 'Impossible de réserver la place');
    } finally {
      setReserving(false);
    }
  };

  // ===== GÉNÉRER LE PLAN AVEC CHAUFFEUR + 4 COLONNES =====
  const renderPlan = () => {
  const nbCoteChauffeur = vehicule?.places_cote_chauffeur || 0;
  const totalPlaces = places.length;

  // 1. Séparer les places côté chauffeur et les autres
  const placesCoteChauffeur = places.filter(p => p.numero_place <= nbCoteChauffeur);
  const autresPlaces = places.filter(p => p.numero_place > nbCoteChauffeur);

  const rows = [];

  // 2.1 Ligne du chauffeur
  const firstRow = [];
  firstRow.push({ type: 'chauffeur', key: 'chauffeur' });
  placesCoteChauffeur.forEach(place => {
    firstRow.push({ type: 'place', key: place.id_place, place });
  });
  rows.push(firstRow);

  // 2.2 Lignes des autres places (par groupes de 4)
  for (let i = 0; i < autresPlaces.length; i += 4) {
    const group = autresPlaces.slice(i, i + 4);
    const row = group.map(place => ({
      type: 'place',
      key: place.id_place,
      place,
    }));
    rows.push(row);
  }

  // 3. Rendu des lignes
  return rows.map((row, rowIndex) => (
    <View key={rowIndex} style={styles.row}>
      {row.map((item) => {
        if (item.type === 'chauffeur') {
          return (
            <View key="chauffeur" style={[styles.placeButton, styles.chauffeurButton]}>
              <Ionicons name="person" size={20} color="#fff" />
              <Text style={styles.chauffeurText}>Chauffeur</Text>
            </View>
          );
        }

        const place = item.place;
        const isReserved = place.statut === 'reservee';
        const isSelected = selectedPlace.some(p => p.id_place === place.id_place);

        return (
          <TouchableOpacity
            key={place.id_place}
            style={[
              styles.placeButton,
              isReserved && styles.placeReserved,
              isSelected && styles.placeSelected,
              !isReserved && !isSelected && styles.placeAvailable,
            ]}
            onPress={() => {
              if (isReserved) {
                Alert.alert('Place réservée', 'Cette place est déjà réservée');
                return;
              }
              togglePlace(place);
            }}
            disabled={isReserved}
          >
            <Text style={styles.placeNumber}>{place.numero_place}</Text>
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
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.title}>🚐 {vehicule?.nom || 'Véhicule'}</Text>
        </View>

        {/* Infos du véhicule */}
        {vehicule && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>📅 {vehicule.date_depart} à {vehicule.heure_depart}</Text>
            <Text style={styles.infoText}>💰 {vehicule.prix_place} Ar / place</Text>
            <Text style={styles.infoText}>📍 {vehicule.ville_depart} → {vehicule.ville_arrivee}</Text>
          </View>
        )}

        {/* Plan des places */}
        <Text style={styles.sectionTitle}>Choisissez votre place</Text>
        <View style={styles.gridContainer}>
          {renderPlan()}
        </View>

        {/* Légende */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.legendText}>Disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#dc3545' }]} />
            <Text style={styles.legendText}>Réservée</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007BFF' }]} />
            <Text style={styles.legendText}>Sélectionnée</Text>
          </View>
        </View>

        {selectedPlace.length > 0 && (
     <View style={styles.totalContainer}>
    <Text style={styles.totalText}>
      {selectedPlace.length} place(s) sélectionnée(s)
    </Text>
    <Text style={styles.totalPrice}>
      Total : {selectedPlace.length * vehicule.prix_place} Ar
    </Text>
    <TouchableOpacity
  style={styles.reserveButton}
  onPress={() => setShowRecap(true)}  // au lieu de onPress={handleReservation}
  disabled={reserving}
>
  <Text style={styles.reserveButtonText}>
    Voir le récapitulatif
  </Text>
</TouchableOpacity>
  </View>
)}
 
      </ScrollView>
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
        <Text style={styles.recapValue}>{vehicule?.ville_depart} → {vehicule?.ville_arrivee}</Text>
      </View>
      <View style={styles.recapRow}>
        <Text style={styles.recapLabel}>Date</Text>
        <Text style={styles.recapValue}>{vehicule?.date_depart} à {vehicule?.heure_depart}</Text>
      </View>
      <View style={styles.recapRow}>
        <Text style={styles.recapLabel}>Places sélectionnées</Text>
        <Text style={styles.recapValue}>
          {selectedPlace.map((p) => p.numero_place).join(', ')}
        </Text>
      </View>
      <View style={styles.recapDivider} />
      <View style={styles.recapRow}>
        <Text style={styles.recapLabelTotal}>Total</Text>
        <Text style={styles.recapValueTotal}>
          {selectedPlace.length * vehicule?.prix_place} Ar
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
            handleReservation(); // la vraie réservation se fait ICI
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginLeft: 12 },
  infoCard: {
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
  infoText: { fontSize: 14, color: '#6C757D', marginVertical: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 12 },
  gridContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  placeButton: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeAvailable: { backgroundColor: '#28a745' },
  placeReserved: { backgroundColor: '#dc3545' },
  placeSelected: { backgroundColor: '#007BFF', borderColor: '#fff', borderWidth: 3 },
  placeNumber: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  chauffeurButton: {
    backgroundColor: '#6C757D',
    borderWidth: 2,
    borderColor: '#6C757D',
    width: 80,
    flexDirection: 'row',
    gap: 4,
  },
  chauffeurText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#555' },
  reserveButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  reserveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  totalContainer: {
  backgroundColor: '#f0f4ff',
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
  alignItems: 'center',
},
totalText: {
  fontSize: 16,
  color: '#1A1A2E',
  fontWeight: '500',
},
totalPrice: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1E3A5F',
  marginVertical: 6,
},
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
recapTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 16 },
recapRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
recapLabel: { fontSize: 14, color: '#6C757D' },
recapValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
recapDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
recapLabelTotal: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
recapValueTotal: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
recapButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
recapCancelButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center' },
recapCancelText: { color: '#1A1A2E', fontWeight: '600' },
recapConfirmButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1E3A5F', alignItems: 'center' },
recapConfirmText: { color: '#fff', fontWeight: '600' },
});