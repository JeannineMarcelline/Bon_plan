import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddTrajetScreen({ navigation, route }) {
  const { vehiculeId } = route.params || {};

  const [villeDepart, setVilleDepart] = useState('');
  const [villeArrive, setVilleArrive] = useState('');
  const [dateDepart, setDateDepart] = useState('');
  const [heureDepart, setHeureDepart] = useState('');
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'JJ/MM/AAAA';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'HH:MM';
    return timeString;
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDateDepart(`${year}-${month}-${day}`);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setHeureDepart(`${hours}:${minutes}`);
    }
  };

  const handleSubmit = async () => {
    if (!villeDepart || !villeArrive || !dateDepart || !heureDepart) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (!vehiculeId) {
      Alert.alert('Erreur', 'Aucun véhicule sélectionné');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('trajets').insert({
        id_vehicule: vehiculeId,
        ville_depart: villeDepart,
        ville_arrivee: villeArrive,
        date_depart: dateDepart,
        heure_depart: heureDepart,
      });

      if (error) throw error;

      Alert.alert('Succès', 'Trajet ajouté !', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Erreur ajout trajet:', error);
      Alert.alert('Erreur', "Impossible d'ajouter le trajet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.title}>Ajouter un trajet</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Ville de départ *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Antananarivo"
                  value={villeDepart}
                  onChangeText={setVilleDepart}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Ville d'arrivée *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Toamasina"
                  value={villeArrive}
                  onChangeText={setVilleArrive}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Date de départ *</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dropdownText, !dateDepart && styles.placeholderText]}>
                    {formatDate(dateDepart)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Heure de départ *</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={[styles.dropdownText, !heureDepart && styles.placeholderText]}>
                    {formatTime(heureDepart)}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Ajout...' : 'Enregistrer le trajet'}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              is24Hour={true}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginLeft: 12 },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  inputGroup: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  dropdownInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  dropdownText: { fontSize: 16, color: '#111827' },
  placeholderText: { color: '#9CA3AF' },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});