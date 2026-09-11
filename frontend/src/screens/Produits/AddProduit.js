import React, { useState, useEffect } from 'react';
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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { getConfigCategorie } from '../../Config/categorieConfig';

const Max_photo = 3;

export default function AddProduit ({navigation, route}) {

const {user} = useAuth();
const produitId = route.params?.produitId || null;
const estModification = produitId !== null;

const [nom_produit, setNom_produit] = useState('');
const [prix_produit, setPrix_produit] = useState('');
const [description_pro, setDescription_pro] = useState('');
const [stock, setStock] = useState('')
const [photos_produit, setPhotos_produit] = useState([]);
const [upLoading, setUpLoading] = useState(false);
const [chargementInitial, setChargementInitial] = useState(true);
const [caracteristiques, setCaracteristique] = useState('');
// Vocabulaire de l'entreprise du pro connecté (chambre, poste, produit...)
const [mots, setMots] = useState(getConfigCategorie(null).vocabulaire);
const [entrepriseId, setEntrepriseId] = useState(null);

useEffect(() => {
  initialiser();
}, []);

const initialiser = async () => {
  try {
    // On récupère toujours la catégorie de l'entreprise, qu'on soit
    // en train d'ajouter ou de modifier, pour adapter le vocabulaire.
    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .select('id, categories ( nom )')
      .eq('utilisateur_id', user.id)
      .maybeSingle();

    if (entrepriseError) throw entrepriseError;

    if (entreprise) {
      setEntrepriseId(entreprise.id);
      const config = getConfigCategorie(entreprise.categories?.nom || null);
      setMots(config.vocabulaire);
    }

    if (estModification) {
      await chargerProduitExistant();
    }
  } catch (error) {
    console.error('Erreur initialisation:', error);
  } finally {
    setChargementInitial(false);
  }
};

const chargerProduitExistant = async () => {
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .eq('id', produitId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setNom_produit(data.nom_produit || '');
      setPrix_produit(data.prix_produit?.toString() || '');
      setDescription_pro(data.description_pro || '');
      setStock(data.stock?.toString() || '');
      setPhotos_produit(data.photos_produit || []);

      if(data.caracteristiques){
        const texte = Object.values(data.caracteristiques).join(', ');
        setCaracteristique(texte);
      }
    }

  } catch (error) {
    console.error('Erreur chargement produit:', error);
    Alert.alert('Erreur', `Impossible de charger cet élément`);
  }
};


const pickImage = async () => {
  if (photos_produit.length >= Max_photo) {
    Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${Max_photo} photo(s)`);
    return;
  }

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

if (!entrepriseId) {
  Alert.alert('Erreur', 'Vous n\'avez pas encore d\'entreprise');
  setUpLoading(false);
  return;
}

const photoUrls = [];
for (let i=0; i < photos_produit.length; i++) {
const uri = photos_produit[i];

if(uri.startsWith('file://') || uri.startsWith('content://')){
const url = await uploadPhoto(photos_produit[i], user.id, i);
if(url) photoUrls.push(url);
}else{
  photoUrls.push(uri);
}
}

const caracteristiquesJson = caracteristiques
.split(',')
.map(item => item.trim())
.filter(item => item.length > 0)
.reduce((obj, item, index) => {
  obj[`detail_${index + 1}`] = item;
  return obj;
}, {});

const donneesProduit = {
  nom_produit,
  description_pro,
  prix_produit: parseFloat(prix_produit),
  stock: parseInt(stock),
  photos_produit: photoUrls.length > 0 ? photoUrls : photos_produit, // garde les anciennes photos si pas de nouvelles
  caracteristiques: caracteristiquesJson,
};

if (estModification) {
  const { error: produitError } = await supabase
    .from('produits')
    .update(donneesProduit)
    .eq('id', produitId);

  if (produitError) throw produitError;

  Alert.alert('Succès', `${mots.produit.charAt(0).toUpperCase() + mots.produit.slice(1)} mis${mots.produit === 'produit' ? '' : 'e'} à jour !`, [
    { text: 'OK', onPress: () => navigation.goBack() }
  ]);
} else {
  const { error: produitError } = await supabase
    .from('produits')
    .insert({
      ...donneesProduit,
      id_entreprise: entrepriseId,
      actif: true,
    });

  if (produitError) throw produitError;

  Alert.alert('Succès', `${mots.produit.charAt(0).toUpperCase() + mots.produit.slice(1)} ajouté${mots.produit === 'produit' ? '' : 'e'} !`, [
    { text: 'OK', onPress: () => navigation.goBack() }
  ]);
}

}catch(error){
console.error('Erreur ajout de produit:' , error);
Alert.alert('Erreur', `Impossible d'enregistrer ${mots.produit === 'produit' ? 'ce produit' : `cette ${mots.produit}`}`);
}finally{
  setUpLoading(false);
}
};

if (chargementInitial) {
  return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  );
}

const nomLabel = mots.produit.charAt(0).toUpperCase() + mots.produit.slice(1);

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
            <Text style={styles.title}>
              {estModification ? `Modifier ${mots.produit === 'produit' ? 'le' : 'la'} ${mots.produit}` : `Ajouter ${mots.produit === 'produit' ? 'un' : 'une'} ${mots.produit}`}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom {mots.produit === 'produit' ? 'du' : 'de la'} {mots.produit} *</Text>
              <TextInput style={styles.input} placeholder={`Ex: ${nomLabel} standard`} value={nom_produit

              } onChangeText={setNom_produit} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Décrivez ce que vous proposez..."
                value={description_pro}
                onChangeText={setDescription_pro}
                multiline
              />
            </View>

             <View style={styles.inputGroup}>
             <Text style={styles.label}>Caractéristiques</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Ex: 2 personnes, wifi, climatisation"
             value={caracteristiques}
             onChangeText={setCaracteristique}
             />
  <Text style={styles.helperText}>
    Séparez chaque caractéristique par une virgule
  </Text>
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
                {upLoading
                   ? 'Enregistrement...'
                   : estModification ? 'Mettre à jour' : `Enregistrer ${mots.produit === 'produit' ? 'le produit' : `la ${mots.produit}`}`}
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
  center:{
    flex:1,
    justifyContent:'center',
    alignItems:'center'
  },
  helperText: {fontSize: 12, color: "#9CA3AF", marginTop: 4},
});