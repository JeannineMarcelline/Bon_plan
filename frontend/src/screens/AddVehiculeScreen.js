import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function AddVehiculeScreen({ navigation }) {
  const { user } = useAuth();
  const [nom, setNom] = useState('');
  const [type, setType] = useState('');
  const [capacite, setCapacite] = useState('');
  const [prix, setPrix] = useState('');
  
  const [photo, setPhoto] = useState(null);
  const [placesCoteChauffeur, setPlacesCoteChauffeur] = useState('0');

  
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };


const uploadPhoto = async (uri, userId) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);
    const fileExt = uri.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicules')
      .upload(fileName, arrayBuffer, { contentType: `image/${fileExt}` });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('vehicules').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error('Erreur upload photo véhicule:', error);
    return null;
  }
};

  const handleSubmit = async () => {
    if (!nom || !type || !capacite || !prix) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
  const { data: entreprise, error: entrepriseError } = await supabase
    .from('entreprises')
    .select('id')
    .eq('utilisateur_id', user.id)
    .maybeSingle();

  if (entrepriseError) throw entrepriseError;
  if (!entreprise) {
    Alert.alert('Erreur', 'Vous n\'avez pas encore d\'entreprise');
    return;
  }


  let photoUrl = null;
  if (photo) {
    photoUrl = await uploadPhoto(photo, user.id);
  }

  const { data: nouveauVehicule, error: vehiculeError } = await supabase
    .from('vehicules')
    .insert({
      nom,
      type,
      photo: photoUrl,
      capacite: parseInt(capacite),
      prix_place: parseFloat(prix),
      id_entreprise: entreprise.id,
      places_cote_chauffeur: parseInt(placesCoteChauffeur),
    })
    .select()
    .single();

  if (vehiculeError) throw vehiculeError;

// trajet dans le AddTrajet

  const placesACreer = [];
  for (let i = 1; i <= parseInt(capacite); i++) {
    placesACreer.push({
      id_vehicule: nouveauVehicule.id_vehicule,
      numero_place: i,
      position: 'standard',
      statut: 'disponible',
    });
  }

  const { error: placesError } = await supabase.from('places').insert(placesACreer);
  if (placesError) throw placesError;

    Alert.alert(
    'Véhicule ajouté',
    `Véhicule ajouté avec ${capacite} places !\n\nVoulez-vous ajouter un trajet maintenant ?`,
    [
      {
        text: 'Plus tard',
        style: 'cancel',
        onPress: () => navigation.goBack(),
      },
      {
        text: 'Ajouter un trajet',
        onPress: () => {
          navigation.replace('AddTrajet', {
            vehiculeId: nouveauVehicule.id_vehicule,
          });
        },
      },
    ]
  );
      
    } catch (error) {
      console.error('Erreur ajout de véhicule :', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le véhicule');
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
          <Text style={styles.title}>Ajouter un véhicule</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du véhicule *</Text>
            <TextInput style={styles.input} placeholder="Ex: Toyota Hiace" value={nom} onChangeText={setNom} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type *</Text>
            <TextInput style={styles.input} placeholder="Ex: Minibus, Taxi-brousse..." value={type} onChangeText={setType} />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Capacité (places) *</Text>
              <TextInput style={styles.input} placeholder="7" keyboardType="numeric" value={capacite} onChangeText={setCapacite} />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Prix par place (Ar) *</Text>
              <TextInput style={styles.input} placeholder="15000" keyboardType="numeric" value={prix} onChangeText={setPrix} />
            </View>
          </View>


          {/* ===== NOUVEAU CHAMP ===== */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Places à côté du chauffeur</Text>
            <View style={styles.row}>
              {[0, 1, 2, 3].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.optionButton,
                    parseInt(placesCoteChauffeur) === val && styles.optionButtonActive,
                  ]}
                  onPress={() => setPlacesCoteChauffeur(String(val))}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      parseInt(placesCoteChauffeur) === val && styles.optionButtonTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Nombre de places sur la même ligne que le chauffeur</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photo du véhicule</Text>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonText}>
                {photo ? '📷 Changer la photo' : '📷 Ajouter une photo'}
              </Text>
            </TouchableOpacity>
            {photo && <Image source={{ uri: photo }} style={styles.photoPreview} />}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Enregistrer le véhicule</Text>
          </TouchableOpacity>
        </View>
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
 
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  photoButton: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  photoButtonText: { fontSize: 14, color: '#1E3A5F' },
  photoPreview: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  // ===== NOUVEAUX STYLES =====
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  optionButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  optionButtonTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});