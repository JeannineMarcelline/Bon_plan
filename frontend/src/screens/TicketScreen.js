import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

export default function TicketScreen () {

const route = useRoute();
const navigation = useNavigation();

const { idReservation } = route.params;

const [reservation, setReservation] = useState(null);

const [loading, setLoading] = useState(true);

useEffect(() => {

const loadReservation = async () => {

try{
const {data, error} = await supabase
.from('reservation_transport')
.select(`
    id_reservation,
    date_reservation,
    prix_total,
    paye,
    utilisateurs ( nom ),
    vehicules ( nom, ville_depart, ville_arrivee, date_depart, heure_depart ),
    reservation_places ( places (numero_place) )
    `)
.eq('id_reservation', idReservation)
.maybeSingle();

if(error) throw error;

if(data) {

const numeros = (data.reservation_places || [])
.map((rp) => rp.places?.numero_place)
.filter(Boolean);

setReservation({
...data, 
client_nom: data.utilisateurs?.nom,
vehicule_nom: data.vehicules?.nom,
ville_depart: data.vehicules?.ville_depart,
ville_arrivee: data.vehicules?.ville_arrivee,
date_depart: data.vehicules?.date_depart,
heure_depart: data.vehicules?.heure_depart,
places: numeros.join(', '),
});
}

}catch(error) {
console.error('Erreur de chargement de billet:', error);
}finally{
  setLoading(false);
}
};

loadReservation();
},[idReservation])

if (loading) {

return(
    <SafeAreaView style={styles.center}>
     <ActivityIndicator size="large" color="#1E3A5F" />
    </SafeAreaView>
);
}
if(!reservation) {
    return(
      <SafeAreaView>
       <Text style={styles.errorText}>Billet introuvable</Text>   
      </SafeAreaView>  
    )
}

return(
    <SafeAreaView style={styles.container}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
            </TouchableOpacity>
           <Text style={styles.title}>Mon billet</Text>
         </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.ticketCard}>
        <View style={styles.payeBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
        <Text style={styles.payeBadgeText}>Payé</Text>
        </View>  
     <View style={styles.qrContainer}>
            <QRCode
              value={String(reservation.id_reservation)}
              size={180}
              backgroundColor="#fff"
              color="#1A1A2E"
            />
     </View>
     <Text style={styles.qrHint}>
            Présentez ce code au chauffeur avant l'embarquement
     </Text>
       <View style={styles.divider} />

          {/* Détails du trajet, pour un contrôle visuel simple par le
              chauffeur (nom, trajet, places) sans avoir besoin de scanner */}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{reservation.client_nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="bus-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{reservation.vehicule_nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {reservation.ville_depart} → {reservation.ville_arrivee}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {reservation.date_depart} à {reservation.heure_depart}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="grid-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>Place(s) n° {reservation.places}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total payé</Text>
            <Text style={styles.totalValue}>{reservation.prix_total} Ar</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Numéro de billet : #{reservation.id_reservation}
        </Text>
    </ScrollView>
    </SafeAreaView>
);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E' },
  scrollContent: { padding: 20, paddingBottom: 40, alignItems: 'center' },

  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  payeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  payeBadgeText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },

  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  qrHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginVertical: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  infoText: { fontSize: 14, color: '#374151', flexShrink: 1 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },

  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
  },
});