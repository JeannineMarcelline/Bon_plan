import React, { useState } from "react";
import { 
View,
Text,
StyleSheet,
TouchableOpacity,
ActivityIndicator,
FlatList, 
Alert,
ScrollView,
Modal,
Linking
} from "react-native";
import {SafeAreaView} from 'react-native-safe-area-context'
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";


export default function ProReservation ({navigation}) {
    const {user} = useAuth();
    const [reservation, setReservation] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtreActif, setFiltreActif] = useState('en_attente');
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailItem, setDetailItem] = useState(null);


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
    id_utilisateur,
    date_reservation,
    statut,
    prix_total,
    paye,
    mode_paiement_reel,
    date_paiement,
    utilisateurs ( nom, telephone ),
    trajets!inner ( ville_depart, ville_arrivee, date_depart, heure_depart, vehicules!inner ( nom, id_entreprise ) ),
    reservation_places ( places ( numero_place ) )
  `)
  .eq('trajets.vehicules.id_entreprise', entreprise.id)
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
    vehicule_nom: r.trajets?.vehicules?.nom,
    ville_depart: r.trajets?.ville_depart,
    ville_arrivee: r.trajets?.ville_arrivee,
    date_depart: r.trajets?.date_depart,
    heure_depart: r.trajets?.heure_depart,
    places: numeros.join(', '),
    nb_places: numeros.length,
  };
});


const ordrePriorite = { en_attente: 0, confirmee: 1, annulee: 2 };
reservationsFormatees.sort(
  (a, b) => (ordrePriorite[a.statut] ?? 3) - (ordrePriorite[b.statut] ?? 3)
);

setReservation(reservationsFormatees); 
    }catch(error){
           console.error('Erreur de chargement de reservation', error);
           setReservation([])
        }finally{
           setLoading(false)
 };

 }

const updateStatut  = async (reservationItem, nouveauStatut) => {
     const idReservation = reservationItem.id_reservation;
     try{
        const { data: current, error: currentError } = await supabase
          .from('reservation_transport')
          .select('statut')
          .eq('id_reservation', idReservation)
          .maybeSingle();

        if (currentError) throw currentError;

        if (current?.statut !== 'en_attente') {
          Alert.alert(
            'Action impossible',
            'Cette réservation a déjà changé de statut (probablement annulée par le client entre-temps).'
          );
          loadReservation();
          return;
        }

        const { error } = await supabase
          .from('reservation_transport')
          .update({ statut: nouveauStatut })
          .eq('id_reservation', idReservation);

        if (error) throw error;

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

        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              utilisateur_id: reservationItem.id_utilisateur,
              titre: nouveauStatut === 'confirmee' ? 'Réservation confirmée' : 'Réservation annulée',
              message: `Votre réservation ${reservationItem.ville_depart} → ${reservationItem.ville_arrivee} du ${reservationItem.date_depart} a été ${nouveauStatut === 'confirmee' ? 'confirmée' : 'annulée'} par le transporteur.`,
              lue: false,
            });
          if (notifError) console.error('Erreur notif client:', notifError);
        } catch (notifErr) {
          console.error('Erreur notif (non bloquant):', notifErr);
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

 // NOUVEAU : liste filtrée selon la puce active
 const reservationsFiltrees =
   filtreActif === 'toutes'
     ? reservation
     : reservation.filter((r) => r.statut === filtreActif);

 // NOUVEAU : compteurs par statut, pour afficher le nombre sur chaque puce
 const compterStatut = (statut) =>
   statut === 'toutes'
     ? reservation.length
     : reservation.filter((r) => r.statut === statut).length;

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

        {/* NOUVEAU : barre de filtres par statut */}
        <View style={styles.filtresWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtresContent}
          >
            {[
              { key: 'en_attente', label: 'En attente' },
              { key: 'confirmee', label: 'Confirmées' },
              { key: 'annulee', label: 'Annulées' },
              { key: 'toutes', label: 'Toutes' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filtrePuce,
                  filtreActif === f.key && styles.filtrePuceActive,
                ]}
                onPress={() => setFiltreActif(f.key)}
              >
                <Text
                  style={[
                    styles.filtrePuceText,
                    filtreActif === f.key && styles.filtrePuceTextActive,
                  ]}
                >
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.filtreCompteur,
                    filtreActif === f.key && styles.filtreCompteurActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filtreCompteurText,
                      filtreActif === f.key && styles.filtreCompteurTextActive,
                    ]}
                  >
                    {compterStatut(f.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MODIFIÉ : "reservation" devient "reservationsFiltrees" */}
        {reservationsFiltrees.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Aucune réservation {filtreActif !== 'toutes' ? `"${getStatutLabel(filtreActif)}"` : 'reçue'}</Text>
        </View>
      ) : (
        <FlatList
          data={reservationsFiltrees}
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
                    <View style={styles.priceRow}>
                <Text style={styles.totalPrice}>Total: {item.prix_total} Ar</Text>
                {/* ⭐ MODIF : Badge Payé / Non payé */}
                {item.paye ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                    <Text style={styles.paidBadgeText}>Payé</Text>
                  </View>
                ) : (
                  <View style={styles.unpaidBadge}>
                    <Ionicons name="time-outline" size={14} color="#92400E" />
                    <Text style={styles.unpaidBadgeText}>Non payé</Text>
                  </View>
                )}
              </View>
              <Text style={styles.phone}>Téléphone: {item.client_telephone || 'Non renseigné'}</Text>

                {/* Actions (pour les réservations en attente) */}
<View style={styles.cardActions}>
  {item.statut === 'en_attente' && (
    <>
      <TouchableOpacity
        style={[styles.actionButton, styles.confirmButton]}
        onPress={() => updateStatut(item, 'confirmee')}
      >
        <Text style={styles.actionButtonText}> Confirmer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.annulerButton]}
        onPress={() => updateStatut(item, 'annulee')}
      >
        <Text style={styles.actionButtonText}> Annuler</Text>
      </TouchableOpacity>
    </>
  )}
  {/* ⭐ MODIF : bouton Voir détails + badge statut */}
  {item.statut !== 'en_attente' && (
    <>
      <View style={[
        styles.statusBadge,
        item.statut === 'confirmee' && styles.statusConfirmed,
        item.statut === 'annulee' && styles.statusAnnulee,
      ]}>
        <Text style={styles.statusText}>{getStatutLabel(item.statut)}</Text>
      </View>
      <TouchableOpacity
        style={styles.detailButton}
        onPress={() => {
          setDetailItem(item);
          setDetailVisible(true);
        }}
      >
        <Ionicons name="information-circle-outline" size={16} color="#1E3A5F" />
        <Text style={styles.detailButtonText}>Détails</Text>
      </TouchableOpacity>
    </>
  )}
</View>
            </View>
          )}
               />
      )}

      {/* ⭐ MODIF : MODALE DÉTAILS */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la réservation</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setDetailVisible(false)}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {detailItem && (
              <ScrollView>
                <Text style={styles.detailSectionTitle}>Client</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{detailItem.client_nom || '—'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => {
                    if (detailItem.client_telephone) {
                      Linking.openURL(`tel:${detailItem.client_telephone}`);
                    }
                  }}
                >
                  <Ionicons name="call-outline" size={16} color="#2563EB" />
                  <Text style={[styles.detailText, { color: '#2563EB' }]}>
                    {detailItem.client_telephone || 'Non renseigné'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.detailSectionTitle}>Trajet</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="bus-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{detailItem.vehicule_nom}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="navigate-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {detailItem.ville_depart} → {detailItem.ville_arrivee}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {detailItem.date_depart} à {detailItem.heure_depart}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="apps-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Places n° {detailItem.places} ({detailItem.nb_places} place
                    {detailItem.nb_places > 1 ? 's' : ''})
                  </Text>
                </View>

                <Text style={styles.detailSectionTitle}>Paiement</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Total : {Number(detailItem.prix_total).toLocaleString('fr-FR')} Ar
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name={detailItem.paye ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={detailItem.paye ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.detailText}>
                    {detailItem.paye
                      ? `Payé via ${detailItem.mode_paiement_reel || 'Mobile Money'}`
                      : 'Non payé'}
                  </Text>
                </View>

                <Text style={styles.detailSectionTitle}>Statut</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {getStatutLabel(detailItem.statut)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  // NOUVEAU : styles de la barre de filtres (repris du même modèle que MesReservationsScreen)
  filtresWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtresContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filtrePuce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  filtrePuceActive: {
    borderColor: '#1E3A5F',
    backgroundColor: '#EFF6FF',
  },
  filtrePuceText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filtrePuceTextActive: { color: '#1E3A5F', fontWeight: '700' },
  filtreCompteur: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtreCompteurActive: { backgroundColor: '#1E3A5F22' },
  filtreCompteurText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  filtreCompteurTextActive: { color: '#1E3A5F' },

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
  // ⭐ MODIF : badges Payé / Non payé
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  unpaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unpaidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },

  // ⭐ MODIF : bouton détails
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },

  // ⭐ MODIF : modale détails
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  }, 
});