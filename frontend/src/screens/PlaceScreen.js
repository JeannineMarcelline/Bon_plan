import React, {useEffect, useState} from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { 
 Text, 
 View,
 TouchableOpacity, 
 ScrollView,
 StyleSheet,
 Alert, 
 ActivityIndicator,
 } from "react-native";
 import {Ionicons} from "@expo/vector-icons";
 import {useRoute, useNavigation} from '@react-navigation/native';
 import db from '../database/database';
 import { useAuth } from '../context/AuthContext';


export default function PlaceScreen () {

 const route = useRoute();
 const navigation = useNavigation();
 
 const {idVehicule} = route.params
 const {user} = useAuth();

 const [places, setPlaces] = useState([]);
 const [vehicule, setVehicule] = useState(null);
 const [loading, setLoading] = useState(true);
 const [selectedPlace, setSelectedPlace] = useState(null);
 const [reserving, setReserving] = useState(false);
 

 useEffect(() => {

  const loadData = async () => {
  try{
    const vehiculeResult = await db.getAllAsync('SELECT * FROM vehicules WHERE id_vehicule = ? ',  [idVehicule]);
    if(vehiculeResult.length > 0 ) {
        setVehicule(vehiculeResult[0]);
    }
    const placeResult = await db.getAllAsync('SELECT * FROM places WHERE id_vehicule = ? ORDER BY numero_place', [idVehicule]);
    setPlaces(placeResult);
  }catch(error){
  console.error('Erreur de chargement de place', error);
  Alert.alert('Erreur', 'erreur de chargement de places');
  }finally{
    setLoading(false);
  }
  };
  loadData();

 }, [idVehicule]);

 // Reserver une place 

 const handleReservation = async () => {

    if(!selectedPlace) {
        Alert.alert('Erreur', 'Veuillez selectionner une place');
        return;
    }

    if(!user) {
        Alert.alert('Erreur', 'connecter vous d\'abord avant de reserver ');
        return;
    }
   setReserving(true);

   try{
    //inserer reservation
    await db.runAsync(
   `INSERT INTO reservation_transport (id_utilisateur, id_vehicule, id_place, horaire_reservation, date_reservation ) VALUES (?, ?, ?, ?, ?) ` ,
   [
     user.id,
     idVehicule,
     selectedPlace.id_place,
     vehicule.heure_depart || '08:00', 
     new Date().toISOString().split('T')[0],
   ]
);
   // marquer la place reserver
   await db.runAsync(
    `UPDATE places SET statut = ?  WHERE id_place = ? `,
    ['reservee', selectedPlace.id_place]
);

Alert.alert(
    'Réservation confirmée ! ', 
    `Vous avez réservé la place ${selectedPlace.numero_place} (${selectedPlace.position})`,
    [
      {
       text: 'OK',
       onPress: () => navigation.navigate('MesReservationsTransport'),
      }
    ]
 );

// Rafraichir la place

  const UpdatePlace = await db.getAllAsync('SELECT * FROM places WHERE id_vehicule = ? ORDER BY numero_place ', [idVehicule]); 
  setPlaces(UpdatePlace);
  setSelectedPlace(null);
   }catch(error){
     console.error('Erreur de réservation: ', error);
     Alert.alert('Erreur', 'Impossible de reserver cette place ');
   }finally{
    setReserving(false);
   }
 };

 if(loading){
    return(
        <SafeAreaView style={styles.center}>
            <ActivityIndicator size='large' color="#007BFF"/>
        </SafeAreaView>
    );
 }

 return(
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                 <Ionicons name="arrow-back" size={24} color="#2c3e50" />
            </TouchableOpacity>
            <Text style={styles.title}>🚐 {vehicule?.nom || 'Véhicule'}</Text>
        </View>

        {vehicule && (
             <View style={styles.infoCard}>
                <Text style={styles.infoText}>{vehicule.date_depart} à {vehicule.heure_depart}</Text>
                <Text style={styles.infoText}>{vehicule.prix_place} Ar / place </Text>
                <Text style={styles.infoText}>{vehicule.ville_depart} → {vehicule.ville_arrivee} </Text>
             </View>
        )}

   {/** plan de place  */}

   <Text style={styles.SectionTitle}>Choisissez votre place</Text>
    <View style={styles.grid}>
        {places.map((place) => {
           const isReserved = place.statut === 'reservee';
           const isSelected = selectedPlace?.id_place === place.id_place;
           return(
            <TouchableOpacity
            key={place.id_place}
            style={[
                styles.placeButton,
                isReserved && styles.placeReserved,
                isSelected && styles.placeSelected,
                !isReserved && !isSelected && styles.placeAvailable,
            ]}
            onPress={() => {
             if(isReserved){
                Alert.alert('Place réserver', 'cette place est déjà réservée');
                return;
             }
              setSelectedPlace(isSelected ? null : place);
            }}
            disabled={isReserved}
            >
            <Text
               style={[
                    styles.placeNumber,
                    isReserved && styles.placeNumberReserved,
                    isSelected && styles.placeNumberSelected,
                  ]}
              >
                {place.numero_place}
            </Text>
            <Text style={styles.placePosition}>{place.position} </Text>
                   {isReserved && (
                  <Ionicons name="lock-closed" size={14} color="#fff" style={styles.lockIcon} />
                )}
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={14} color="#fff" style={styles.checkIcon} />
                )}
            </TouchableOpacity>
           );
        })}
    </View>

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

        {/** bouton de reservation */}

        {selectedPlace && (
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={handleReservation}
            disabled={reserving}
          >
            <Text style={styles.reserveButtonText}>
              {reserving ? 'Réservation en cours...' : `✅ Réserver la place ${selectedPlace.numero_place}`}
            </Text>
          </TouchableOpacity>
        )}
    </ScrollView>
  </SafeAreaView>
 );  
}

const styles = StyleSheet.create({
     container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginLeft: 12 },
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
   infoText: { fontSize: 14, color: '#555', marginVertical: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  placeButton: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
    placeAvailable: { backgroundColor: '#28a745' },
  placeReserved: { backgroundColor: '#dc3545' },
  placeSelected: { backgroundColor: '#007BFF', borderColor: '#fff', borderWidth: 3 },
  placeNumber: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeNumberReserved: { color: '#fff' },
  placeNumberSelected: { color: '#fff' },
  placePosition: { fontSize: 10, color: '#fff', opacity: 0.8, marginTop: 2 },
  lockIcon: { position: 'absolute', top: 4, right: 4 },
  checkIcon: { position: 'absolute', top: 4, right: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
   legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#555' },
  reserveButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  reserveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },


})