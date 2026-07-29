import React, {useState, useEffect} from "react";
import {
    Text,
    FlatList, 
    View,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

import { SafeAreaView } from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import db from '../database/database';
import { useFocusEffect } from "@react-navigation/native";

export default function MesReservationScreen ({navigation}) {
const { user } = useAuth();
const [reservations, setReservations] = useState([]);
const [loading , setLoading] = useState(true);

const loadReservation = async () => {
    try{
     const result = await db.getAllAsync(
        `SELECT r.*, v.nom as vehicule_nom, v.ville_depart, v.ville_arrivee, v.date_depart,
        v.heure_depart, p.numero_place, p.position
        FROM reservation_transport r
        JOIN vehicules v ON r.id_vehicule = v.id_vehicule
        JOIN places p ON r.id_place = p.id_place
        WHERE r.id_utilisateur = ?
        ORDER BY r.date_reservation DESC`, [user.id]);
        setReservations(result || []);
    }catch(error){
    console.error('Erreur de chargement de reservations', error);
      setReservations([]);
    }finally{
    setLoading(false)
    }
};

useFocusEffect(
    React.useCallback(() => {
     loadReservation();
    }, [])
);

if(loading){
    return(
       <SafeAreaView style={styles.center}>
         <ActivityIndicator size='large' color='#ff0000'/> 
       </SafeAreaView> 
    );
}

return(
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
        <Text style={styles.title}>Mes Réservations </Text>
    </View>

    {!reservations || reservations.length === 0 ? (
       <View style={styles.empty}>
        <Ionicons name="calendar-outline" size={50} color="#ccc" />
        <Text style={styles.emptyText}>Aucune Réservations</Text>
       </View>
 ) : (
    <FlatList
    data={reservations}
    keyExtractor={( item ) => item.id_reservation.toString()}
    renderItem={({ item }) => (
        <View style={styles.card}>
        <Text style={styles.vehiculeNom}>{item.vehicule_nom}</Text>
        <Text style={styles.info}>{item.ville_depart} → {item.ville_arrivee} </Text> 
        <Text style={styles.info}>{item.date_depart} à {item.heure_depart}</Text> 
        <Text style={styles.info}> Place n° {item.numero_place} ({item.position})</Text>

         <View style={styles.badgeContainer}>
                <Text style={[styles.badge, styles.badgeConfirmed]}> Confirmée</Text>
              </View>
         </View> 
    )}
 
    />
 )}
  </SafeAreaView>
)
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#95a5a6', marginTop: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehiculeNom: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  info: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
  badgeContainer: { marginTop: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  badgeConfirmed: { backgroundColor: '#d4edda', color: '#155724' },
});
