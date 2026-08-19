import React, { useState } from "react";
import {
  Text,
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { supabase } from '../lib/supabase';
import { useFocusEffect } from "@react-navigation/native";

export default function MesReservationScreen({ navigation }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservation_transport')
        .select(`
          id_reservation,
          date_reservation,
          statut,
          prix_total,
          paye,
          vehicules ( nom, photo, ville_depart, ville_arrivee, date_depart, heure_depart ),
          reservation_places ( places ( numero_place ) )
        `)
        .eq('id_utilisateur', user.id)
        .order('date_reservation', { ascending: false });
      if (error) throw error;

      const reservationsFormatees = (data || []).map((r) => {
        const numeros = (r.reservation_places || [])
          .map((rp) => rp.places?.numero_place)
          .filter(Boolean);
        return {
          ...r,
          vehicule_nom: r.vehicules?.nom,
          vehicule_photo: r.vehicules?.photo,
          ville_depart: r.vehicules?.ville_depart,
          ville_arrivee: r.vehicules?.ville_arrivee,
          date_depart: r.vehicules?.date_depart,
          heure_depart: r.vehicules?.heure_depart,
          places: numeros.join(', '),
          nb_places: numeros.length,
        };
      });
      setReservations(reservationsFormatees);
    } catch (error) {
      console.error('Erreur de chargement de reservations', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayer = async (idReservation) => {
    try {
      const { error } = await supabase
        .from('reservation_transport')
        .update({ paye: true })
        .eq('id_reservation', idReservation);

      if (error) throw error;

      Alert.alert('Paiement effectué', 'Votre paiement (simulé) a bien été enregistré.');
      loadReservation();
    } catch (error) {
      console.error('Erreur paiement:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le paiement');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadReservation();
    }, [])
  );

  const getStatutConfig = (statut) => {
    if (statut === 'confirmee') {
      return { label: 'Confirmée', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' };
    }
    if (statut === 'annulee') {
      return { label: 'Annulée', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
    }
    return { label: 'En attente', color: '#D97706', bg: '#FEF3C7', icon: 'time' };
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
      <View style={styles.header}>
        <Text style={styles.title}>Mes réservations</Text>
      </View>

      {!reservations || reservations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucune réservation</Text>
          <Text style={styles.emptySubtext}>
            Vos réservations de transport apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id_reservation.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const statutConfig = getStatutConfig(item.statut);
            return (
              <TouchableOpacity
  onPress={() => {
    if (item.statut === 'confirmee' && item.paye) {
      navigation.navigate('TicketScreen', { idReservation: item.id_reservation });
    }
  }}
  activeOpacity={item.statut === 'confirmee' && item.paye ? 0.8 : 1}
>
     <View style={styles.card}>
                {/* En-tête : photo + nom véhicule + statut */}
                <View style={styles.cardHeader}>
                  {item.vehicule_photo ? (
                    <Image source={{ uri: item.vehicule_photo }} style={styles.vehicleImage} />
                  ) : (
                    <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
                      <Ionicons name="car-outline" size={26} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.headerInfo}>
                    <Text style={styles.vehiculeNom} numberOfLines={1}>{item.vehicule_nom}</Text>
                    <View style={[styles.statutBadge, { backgroundColor: statutConfig.bg }]}>
                      <Ionicons name={statutConfig.icon} size={12} color={statutConfig.color} />
                      <Text style={[styles.statutText, { color: statutConfig.color }]}>
                        {statutConfig.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Détails du trajet */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {item.ville_depart} <Ionicons name="arrow-forward" size={12} color="#9CA3AF" /> {item.ville_arrivee}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {item.date_depart} à {item.heure_depart}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="grid-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {item.nb_places} place(s) — n° {item.places}
                    </Text>
                  </View>
                </View>

                {/* Pied de carte : prix + action */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Total</Text>
                    <Text style={styles.priceValue}>{item.prix_total} Ar</Text>
                  </View>

                  {item.statut === 'confirmee' && !item.paye && (
                    <TouchableOpacity
                      style={styles.payerButton}
                      onPress={() => handlePayer(item.id_reservation)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="card-outline" size={16} color="#fff" />
                      <Text style={styles.payerButtonText}>Payer</Text>
                    </TouchableOpacity>
                  )}

                  {item.statut === 'confirmee' && item.paye && (
                    <View style={styles.payeBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={styles.payeBadgeText}>Payé</Text>
                    </View>
                  )}
                </View>
              </View>
</TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  list: { padding: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vehicleImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  vehicleImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehiculeNom: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '700',
  },

  detailsSection: {
    marginBottom: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    flexShrink: 1,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E3A5F',
  },

  payerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  payerButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  payeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  payeBadgeText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },
});