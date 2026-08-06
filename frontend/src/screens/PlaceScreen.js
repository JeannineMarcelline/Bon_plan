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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';
import { useAuth } from '../context/AuthContext';

export default function PlacesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { idVehicule } = route.params;
  const { user } = useAuth();

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
        // 1. Récupérer les infos du véhicule
        const vehiculeResult = await db.getAllAsync(
          'SELECT * FROM vehicules WHERE id_vehicule = ?',
          [idVehicule]
        );
        if (vehiculeResult.length > 0) {
          setVehicule(vehiculeResult[0]);
        }

        // 2. Récupérer les places
        const placesResult = await db.getAllAsync(
          'SELECT * FROM places WHERE id_vehicule = ? ORDER BY numero_place',
          [idVehicule]
        );
        setPlaces(placesResult);
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
      //verifier que toute les places sont disponible
      for(const place of selectedPlace) {
         const check = await db.getAllAsync(
          'SELECT statut FROM places WHERE id_place = ?',
          [place.id_place]
         );
         if(check[0]?.statut === 'reservee'){
          Alert.alert('Désolé', `la place ${place.numero_place} vient d'être réservée`);
          setReserving(false);
          return;
         }
      }
      
    const totalPrix = selectedPlace.length * vehicule.prix_place;

    const result = await db.runAsync(
      `INSERT INTO reservation_transport (id_utilisateur, id_vehicule, date_reservation, prix_total, statut)
       VALUES (?, ?, ?, ?, ?)`, [user.id, idVehicule, new Date().toISOString().split('T')[0], totalPrix, 'confirmee']
    );

    const idReservation = result.lastInsertRowId;

     for(const place of selectedPlace) {
      await db.runAsync(`INSERT INTO reservation_places (id_reservation, id_place)
         VALUES (?, ?)`, [ idReservation, place.id_place]
        );

        await db.runAsync(
        'UPDATE places SET statut = ? WHERE id_place = ?',
        ['reservee', place.id_place]
      );
    }

      Alert.alert(
        'Réservation confirmée!',
        `${selectedPlace.length} places réservée - Total : ${totalPrix} Ar`,
         [{ text : 'OK', onPress: () => navigation.navigate('MesReservations')}]
      );


      // Rafraîchir les places
      const updatedPlaces = await db.getAllAsync(
        'SELECT * FROM places WHERE id_vehicule = ? ORDER BY numero_place',
        [idVehicule]
      );
      setPlaces(updatedPlaces);
      setSelectedPlace([]);
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
      onPress={handleReservation}
      disabled={reserving}
    >
      <Text style={styles.reserveButtonText}>
        {reserving ? 'Réservation en cours...' : ` Réserver ${selectedPlace.length} place(s)`}
      </Text>
    </TouchableOpacity>
  </View>
)}
 
      </ScrollView>
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
});