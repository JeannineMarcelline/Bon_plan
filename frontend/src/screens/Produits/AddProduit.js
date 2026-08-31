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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const Max_photo = 3;

export default function AddProduit ({navigation}) {

const {user} = useAuth();

const [nom_produit, setNom_produit] = useState('');
const [prix_produit, setPrix_produit] = useState('');
const [description_pro, setDescription_pro] = useState('');
const [stock, setStock] = useState('')
const [photos_produit, setPhotos_produit] = useState([]);
const [upLoading, setUpLoading] = useState(false);

const pickImage = async () => {
  if (photos_produit.length >= Max_photo) {
    Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${Max_photo} photo(s)`);
    return;
  }

  // ✅ Utiliser requestMediaLibraryPermissionsAsync() au lieu de getMediaLibraryPermissionsAsync()
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée', 
      'Vous devez autoriser l\'accès à la galerie pour ajouter des photos.'
    );
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setPhotos_produit([...photos_produit, result.assets[0].uri]);
  }
};




const removePhoto = (index) => {
 setPhotos_produit(photos_produit.filter((_, i) => i !== index));
};


const uploadPhoto = async (uri, userId, index) => {
try{
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64
  
});

const arrayBuffer = decode(base64);
const fileExt = uri.split('.').pop();
const fileName = `${userId}-${Date.now()}-${index}.${fileExt}`;

const  { error: uploadError } = await supabase.storage
.from('produit_photo')
.upload(fileName, arrayBuffer, {contentType: `image/${fileExt}`});

if (uploadError) throw uploadError;

const { data } = supabase.storage.from('produit_photo').getPublicUrl(fileName);

return data.publicUrl;
}catch(error){
    console.error('Erreur upload photo produit:', error);
    return null;
}
};

const handleSubmit = async () => {
if(!nom_produit || !prix_produit || !stock) {
  Alert.alert ('Erreur', 'Veuillez remplir tous les champs obligatoires');
  return;
}
try{
setUpLoading(true);

const { data: entreprise, error: entrepriseError} = await supabase
.from('entreprises')
.select('id')
.eq('utilisateur_id', user.id)
.maybeSingle();

if (entrepriseError) throw entrepriseError;

if(!entreprise){

Alert.alert('Erreur', 'Vous n\'avez pas encore d\'entreprise');
setUpLoading(false);
return;
}

const photoUrls = [];
for (let i=0; i < photos_produit.length; i++) {
const url = await uploadPhoto(photos_produit[i], user.id, i);
if(url) photoUrls.push(url);

}

const {error: produitError} = await supabase
.from('produits')
.insert({
  nom_produit,
  description_pro,
  prix_produit: parseFloat(prix_produit),
  stock: parseInt(stock),
  photos_produit: photoUrls,
  id_entreprise: entreprise.id,
});

if (produitError) throw produitError;

Alert.alert('Succès', 'Produit ajouté !');

}catch(error){
console.error('Erreur ajout de produit:' , error);
Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
}finally{
  setUpLoading(false);
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
            <Text style={styles.title}>Ajouter un produit</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom du produit *</Text>
              <TextInput style={styles.input} placeholder="Ex: Tomates fraîches" value={nom_produit

              } onChangeText={setNom_produit} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Décrivez votre produit..."
                value={description_pro}
                onChangeText={setDescription_pro}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Prix (Ar) *</Text>
                <TextInput style={styles.input} placeholder="5000" keyboardType="numeric" value={prix_produit} onChangeText={setPrix_produit} />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Stock disponible *</Text>
                <TextInput style={styles.input} placeholder="20" keyboardType="numeric" value={stock} onChangeText={setStock} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photos ({photos_produit.length}/{Max_photo})</Text>

              {photos_produit.length < Max_photo && (
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Text style={styles.photoButtonText}>📷 Ajouter une photo</Text>
                </TouchableOpacity>
              )}

              <View style={styles.photosRow}>
                {photos_produit.map((uri, index) => (
                  <View key={index} style={styles.photoPreviewWrap}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                      <Ionicons name="close-circle" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, upLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={upLoading}
            >
              <Text style={styles.submitButtonText}>
                {upLoading ? 'Enregistrement...' : 'Enregistrer le produit'}
              </Text>
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
  photosRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoPreviewWrap: { position: 'relative' },
  photoPreview: { width: 90, height: 90, borderRadius: 8 },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});