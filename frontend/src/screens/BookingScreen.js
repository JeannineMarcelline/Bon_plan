import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { entreprises } from '../data/mockData';

export default function BookingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const entreprise = entreprises.find(e => e.id === id);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [personnes, setPersonnes] = useState('1');

  const handleBooking = () => {
    if (!dateDebut || !dateFin) {
      Alert.alert('Erreur', 'Veuillez sélectionner vos dates');
      return;
    }

    Alert.alert(
      '✅ Réservation confirmée !',
      `Vous avez réservé chez ${entreprise.nom}\nDu ${dateDebut} au ${dateFin}\nPour ${personnes} personne(s)`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réserver</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.companyName}>{entreprise.nom}</Text>
        <Text style={styles.companyAdresse}>{entreprise.adresse}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>📅 Date d'arrivée</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA"
            value={dateDebut}
            onChangeText={setDateDebut}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>📅 Date de départ</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA"
            value={dateFin}
            onChangeText={setDateFin}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>👤 Nombre de personnes</Text>
          <View style={styles.personContainer}>
            <TouchableOpacity
              style={styles.personButton}
              onPress={() => setPersonnes(Math.max(1, parseInt(personnes) - 1).toString())}
            >
              <Ionicons name="remove" size={20} color="#007BFF" />
            </TouchableOpacity>
            <Text style={styles.personCount}>{personnes}</Text>
            <TouchableOpacity
              style={styles.personButton}
              onPress={() => setPersonnes((parseInt(personnes) + 1).toString())}
            >
              <Ionicons name="add" size={20} color="#007BFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total estimé</Text>
          <Text style={styles.totalPrice}>120 000 Ar</Text>
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={handleBooking}>
          <Text style={styles.confirmButtonText}>Confirmer la réservation</Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          ⚠️ Annulation gratuite jusqu'à 24h avant l'arrivée
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    padding: 20,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  companyAdresse: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
    marginBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  personButton: {
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  personCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 30,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  confirmButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoText: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
  },
});