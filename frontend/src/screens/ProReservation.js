import React, { useState } from "react";
import { 
SafeAreaView, 
View,
Text,
StyleSheet,
TouchableOpacity,
ActivityIndicator,
FlatList, 
Alert
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";


export default function ProReservation ({navigation}) {
    const {user} = useAuth();
    const [reservation, setReservation] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadReservation = async () => {
        try{
             const { data: entreprise, error: entrepriseError } = await supabase
  .from('entreprises')
  .select('id')
  .eq('utilisateur_id', user.id)
  .maybeSingle();

if (entrepriseError) throw entrepriseError;

if (!entreprise) {
  setReservation([]);
  setLoading(false);
  return;
}

const { data, error } = await supabase
  .from('reservation_transport')
  .select(`
    id_reservation,
    date_reservation,
    statut,
    prix_total,
    utilisateurs ( nom, telephone ),
    vehicules!inner ( nom, ville_depart, ville_arrivee, date_depart, heure_depart, id_entreprise ),
    reservation_places ( places ( numero_place ) )
  `)
  .eq('vehicules.id_entreprise', entreprise.id)
  .order('date_reservation', { ascending: false });

if (error) throw error;

const reservationsFormatees = (data || []).map((r) => {
  const numeros = (r.reservation_places || [])
    .map((rp) => rp.places?.numero_place)
    .filter(Boolean);

  return {
    ...r,
    client_nom: r.utilisateurs?.nom,
    client_telephone: r.utilisateurs?.telephone,
    vehicule_nom: r.vehicules?.nom,
    ville_depart: r.vehicules?.ville_depart,
    ville_arrivee: r.vehicules?.ville_arrivee,
    date_depart: r.vehicules?.date_depart,
    heure_depart: r.vehicules?.heure_depart,
    places: numeros.join(', '),
    nb_places: numeros.length,
  };
});

setReservation(reservationsFormatees); 
    }catch(error){
           console.error('Erreur de chargement de reservation', error);
           setReservation([])
        }finally{
           setLoading(false)
 };

 }

const updateStatut  = async (idReservation, nouveauStatut) => {
     try{
        const { error } = await supabase
          .from('reservation_transport')
          .update({ statut: nouveauStatut })
          .eq('id_reservation', idReservation);

        if (error) throw error;

        // Si la réservation est annulée, on libère les places qui lui étaient liées
        if (nouveauStatut === 'annulee') {
          const { data: placesReservees, error: placesError } = await supabase
            .from('reservation_places')
            .select('id_place')
            .eq('id_reservation', idReservation);

          if (placesError) throw placesError;

          const idsPlaces = (placesReservees || []).map((rp) => rp.id_place);

          if (idsPlaces.length > 0) {
            const { error: updatePlacesError } = await supabase
              .from('places')
              .update({ statut: 'disponible' })
              .in('id_place', idsPlaces);

            if (updatePlacesError) throw updatePlacesError;
          }
        }

       Alert.alert('Succès', `Réservation ${nouveauStatut === 'confirmee' ? 'confirmée' : 'annulée'}`);
       loadReservation();
      }catch(error){
      console.error('Erreur mise à jour de statut:', error);
      Alert.alert('Erreur', 'Impossible de mise à jour');

      }
}

const getStatutLabel = (statut) => {
if(statut == 'confirmee') return 'Confirmée';
if(statut == 'annulee') return 'Annulée';
return 'En attente' ;
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
               
              </View>

              <Text style={styles.vehiculeNom}>{item.vehicule_nom}</Text>
              <Text style={styles.info}>Destination: {item.ville_depart} → {item.ville_arrivee}</Text>
              <Text style={styles.info}>Départ: {item.date_depart} à {item.heure_depart}</Text>
              <Text style={styles.info}>
                 Place réserver: {item.places}
              </Text>
              <Text style={styles.totalPrice}>Total: {item.prix_total} Ar</Text>
              <Text style={styles.phone}>Téléphone: {item.client_telephone || 'Non renseigné'}</Text>

                {/* Actions (pour les réservations en attente) */}
<View style={styles.cardActions}>
  {item.statut === 'en_attente' && (
    <>
      <TouchableOpacity
        style={[styles.actionButton, styles.confirmButton]}
        onPress={() => updateStatut(item.id_reservation, 'confirmee')}
      >
        <Text style={styles.actionButtonText}> Confirmer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.annulerButton]}
        onPress={() => updateStatut(item.id_reservation, 'annulee')}
      >
        <Text style={styles.actionButtonText}> Annuler</Text>
      </TouchableOpacity>
    </>
  )}
  {item.statut !== 'en_attente' && (
    <View style={[
      styles.statusBadge,
      item.statut === 'confirmee' && styles.statusConfirmed,
      item.statut === 'annulee' && styles.statusAnnulee,
    ]}>
      <Text style={styles.statusText}>{getStatutLabel(item.statut)}</Text>
    </View>
  )}
</View>
 

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
  cardActions: {
  flexDirection: 'row',
  marginTop: 10,
  gap: 8,
},
actionButton: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
  alignItems: 'center',
  flex: 1,
},
confirmButton: {
  backgroundColor: '#28a745',
},
annulerButton: {
  backgroundColor: '#dc3545',
},
actionButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
},
statusBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  alignItems: 'center',
  flex: 1,
},
statusConfirmed: {
  backgroundColor: '#d4edda',
},
statusAnnulee: {
  backgroundColor: '#f8d7da',
},
statusText: {
  fontWeight: 'bold',
  fontSize: 14,
},
});