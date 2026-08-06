import React, { useState } from "react";
import {
  Text,
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import db from '../database/database';
import { useFocusEffect } from "@react-navigation/native";

export default function MesReservationScreen({ navigation }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

const loadReservation = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT 
        r.id_reservation,
        r.date_reservation,
        r.statut,
        r.prix_total,
        v.nom as vehicule_nom,
        v.photo as vehicule_photo,
        v.ville_depart,
        v.ville_arrivee,
        v.date_depart,
        v.heure_depart,
        GROUP_CONCAT(p.numero_place, ', ') as places,
        COUNT(rp.id_place) as nb_places
      FROM reservation_transport r
      JOIN vehicules v ON r.id_vehicule = v.id_vehicule
      JOIN reservation_places rp ON r.id_reservation = rp.id_reservation
      JOIN places p ON rp.id_place = p.id_place
      WHERE r.id_utilisateur = ?
      GROUP BY r.id_reservation
      ORDER BY r.date_reservation DESC
    `, [user.id]);
    setReservations(result || []);
  } catch (error) {
    console.error('Erreur de chargement de reservations', error);
    setReservations([]);
  } finally {
    setLoading(false);
  }
};

  useFocusEffect(
    React.useCallback(() => {
      loadReservation();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size='large' color='#1E3A5F' />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Mes Réservations</Text>
      </View>

      {!reservations || reservations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>Aucune Réservation</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id_reservation.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Photo */}
              {item.vehicule_photo ? (
                <Image source={{ uri: item.vehicule_photo }} style={styles.vehicleImage} />
              ) : (
                <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
                  <Ionicons name="car-outline" size={30} color="#aaa" />
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.vehiculeNom}>{item.vehicule_nom}</Text>
                <Text style={styles.info}>📍 {item.ville_depart} → {item.ville_arrivee}</Text>
                <Text style={styles.info}>📅 {item.date_depart} à {item.heure_depart}</Text>
                <Text style={styles.info}>
                  🪑  {item.nb_places} place(s) : {item.places}
                </Text>
                <Text style={styles.totalPrice}>💰 Total : {item.prix_total} Ar</Text>
                <View style={styles.badgeContainer}>
                  <Text style={[styles.badge, styles.badgeConfirmed]}>
                     {item.statut === 'confirmee' ? 'Confirmée' : item.statut}
                  </Text>
                </View>
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
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A2E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6C757D', marginTop: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginLeft: 12 },
  vehicleImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  vehicleImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehiculeNom: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  info: { fontSize: 14, color: '#6C757D', marginTop: 4 },
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginTop: 4 },
  badgeContainer: { marginTop: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  badgeConfirmed: { backgroundColor: '#d4edda', color: '#155724' },
});