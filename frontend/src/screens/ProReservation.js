import React, { useState } from "react";
import { 
SafeAreaView, 
View,
Text,
StyleSheet,
TouchableOpacity,
ActivityIndicator,
FlatList, 
SafeAreaViewBase
} from "react-native";
import { useAuth } from "../context/AuthContext";
import db from "../database/database";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";


export default function ProReservation ({navigation}) {
    const {user} = useAuth();
    const [reservation, setReservation] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadReservation = async () => {
        try{
               const entreprises = await db.getAllAsync('SELECT id FROM entreprises WHERE utilisateur_id = ? ', [user.id]);
               if(entreprises.length === 0) {
               setReservation([]);
               setLoading(false);
               return;
                     }
        const idEntreprise = entreprises[0].id;
        const result = await db.getAllAsync(
        ` 
        SELECT 
            r.id_reservation,
            r.date_reservation,
            r.statut,
            r.prix_total,
            u.nom as client_nom,
            u.telephone as client_telephone,
            v.nom as vehicule_nom,
            v.ville_depart,
            v.ville_arrivee,
            v.date_depart,
            v.heure_depart,
            GROUP_CONCAT(p.numero_place, ', ') as places,
            COUNT(rp.id_place) as nb_places
            FROM reservation_transport r
            JOIN utilisateurs u ON r.id_utilisateur = u.id
            JOIN vehicules v ON r.id_vehicule = v.id_vehicule
            JOIN reservation_places rp ON r.id_reservation = rp.id_reservation
            JOIN places p ON rp.id_place = p.id_place
            WHERE v.id_entreprise = ?
            GROUP BY r.id_reservation
            ORDER BY r.date_reservation DESC`, [idEntreprise]); 

      setReservation(result || []);
    }catch(error){
           console.error('Erreur de chargement de reservation', error);
           setReservation([])
        }finally{
           setLoading(false)
 };

 }

 useFocusEffect(
    React.useCallback(() => {
     loadReservation();
    }, [])
 );

 if(loading){
    return(
   <SafeAreaView style={styles.center}>
        <ActivityIndicator size='large' color="#1E3A5F" />
    </SafeAreaView>
    );   
 }

return(
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
             <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.title}> Reservation reçues </Text>
        </View>
        {reservation.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Aucune réservation reçue</Text>
        </View>
      ) : (
        <FlatList
          data={reservation}
          keyExtractor={(item) => item.id_reservation.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.clientNom}>{item.client_nom}</Text>
                <View style={[styles.badge, styles.badgeConfirmed]}>
                  <Text style={styles.badgeText}> Confirmée</Text>
                </View>
              </View>

              <Text style={styles.vehiculeNom}>{item.vehicule_nom}</Text>
              <Text style={styles.info}>📍 {item.ville_depart} → {item.ville_arrivee}</Text>
              <Text style={styles.info}>📅 {item.date_depart} à {item.heure_depart}</Text>
              <Text style={styles.info}>
                🪑 {item.nb_places} place(s) : {item.places}
              </Text>
              <Text style={styles.totalPrice}>💰 Total : {item.prix_total} Ar</Text>
              <Text style={styles.phone}>📞 {item.client_telephone || 'Non renseigné'}</Text>
            </View>
          )}
        />
      )}

    </SafeAreaView>
); 
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginLeft: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6C757D', marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientNom: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F' },
  vehiculeNom: { fontSize: 15, fontWeight: 'bold', color: '#1A1A2E' },
  info: { fontSize: 14, color: '#6C757D', marginTop: 4 },
  totalPrice: { fontSize: 15, fontWeight: 'bold', color: '#1E3A5F', marginTop: 4 },
  phone: { fontSize: 13, color: '#6C757D', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeConfirmed: { backgroundColor: '#d4edda' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#155724' },
});
   
  

   
