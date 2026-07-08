import React, {useState, useEffect} from "react";
import {View, Text, TextInput, TouchableOpacity, StyleSheet,SafeAreaView,
    ScrollView,Alert,ActivityIndicator,
} from  'react-native';
import { useAuth } from "../context/AuthContext";
import db from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';


export default function AddCompanyScreen({navigation}){
    const {user} = useAuth();

    const [nom, setNom] = useState('');
    const [description, setDescription] = useState('');
    const [adresse, setAdresse] = useState('');
    const [telephone, setTelephone] = useState('');
    const [siteweb, setSiteweb] = useState('');
    const [logo,setLogo] = useState('');
    


    const [villes, setVilles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [villeId,setVilleId] = useState(null);
    const [categorieId, setCategorieId] = useState(null);
    const [logoUri, setLogoUri] = useState(null);

    const [loading, setLoading] = useState(false);
    const[loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try{
           const villesResult = await db.getAllAsync('SELECT * FROM villes ORDER BY nom');
           const categoriesResult = await db.getAllAsync('SELECT * FROM categories ORDER BY nom');

           setVilles(villesResult);
           setCategories(categoriesResult);

            }catch(error){
         console.error('Erreur chargement données:', error);
         Alert.alert('Erreur', 'Impossible de charger les données');
            }finally{
                setLoadingData(false);
            }
        };
        loadData();
    },[]);

    if(user?.role !== 'pro'){
        return(
            <SafeAreaView style={style.container}>
              <View style={styles.center}>
                <Ionicons name='lock-closed' size={60} color='#e74c3c'/>
                <Text style={styles.errorTitle}>Accès refusé</Text>
                <Text style={styles.errorText}>
                    Seuls les Professionnels peuvent ajouter une entreprise
                </Text>
                <TouchableOpacity
                 style={styles.backButton}
                 onPress={() => navigation.goBack()}
                >
                 <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
        );
    }

  const pickImage = async () =>{
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:[1,1],
      quality:0.8,
    });
    if(!result.canceled){
      const uri = result.assets[0].uri;
      setLogoUri(uri);
      setLogo(uri);
    }
  }


   const handleSubmit = async () =>{
    if(!nom || !adresse || !telephone || !villeId || !categorieId ){
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    try{
    const result = await db.runAsync(
     `INSERT INTO entreprises (nom, description, adresse, telephone, siteweb, logo, 
     ville_id, categorie_id, utilisateur_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
     [
        nom,
        description || '',
        adresse,
        telephone,
        siteweb || '',
        logo || '',
        villeId,
        categorieId,
        user.id,
      'en_attente' 
     ]
    );
    Alert.alert(
        'Succès',
        'Votre entreprise a été créée avec succès !',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    }catch(error){
      console.error('Erreur création entreprise:' ,error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }finally{
        setLoading(false);
    }
   };

   if(loadingData) {
    return(
        <SafeAreaView>
            <ActivityIndicator size="large" color="#007BFF"/>
        </SafeAreaView>
    );
   }

return(
    <SafeAreaView style={styles.container} >
        <ScrollView contentContainerStyle={styles.scrollContent} >
         <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name='arrow-back' size={24} color='#2c3e50'/>
          </TouchableOpacity>
           <Text style={styles.title}> Ajouter mon entreprise</Text>
         </View>
     {/**Formulaire */}

    <View style={styles.form}>
    <View style={styles.inputContainer}>
        <Text style={styles.label}>Nom de l'entreprise *</Text>
        <TextInput
        style={styles.input}
        placeholder="Ex: Hôtel Fianar"
        value={nom}
        onChangeText={setNom}
        />
    </View>

  <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Décrivez votre activité"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        />
    </View>

   <View style={styles.inputContainer}>
        <Text style={styles.label}>Adresse *</Text>
        <TextInput
        style={styles.input}
        placeholder="Ex: Rue du 26 juin, Fianarantsoa"
        value={adresse}
        onChangeText={setAdresse}
        />
    </View>

     <View style={styles.inputContainer}>
        <Text style={styles.label}>Téléphone *</Text>
        <TextInput
        style={styles.input}
        placeholder="Ex: 034 00 000 00"
        value={telephone}
        onChangeText={setTelephone}
        keyboardType="phone-pad"
        />
    </View>

    <View style={styles.inputContainer}>
        <Text style={styles.label}>Site web</Text>
        <TextInput
        style={styles.input}
        placeholder="Ex: www.monentreprise.mg"
        value={siteweb}
        onChangeText={setSiteweb}
        autoCapitalize="none"
        />
    </View>

   {/* Logo (photo) */}
<View style={styles.inputContainer}>
  <Text style={styles.label}>Logo de l'entreprise</Text>
  
  <View style={styles.logoContainer}>
    {logoUri ? (
      <Image source={{ uri: logoUri }} style={styles.logoPreview} />
    ) : (
      <View style={styles.logoPlaceholder}>
        <Ionicons name="image-outline" size={50} color="#ccc" />
        <Text style={styles.logoPlaceholderText}>Aucun logo</Text>
      </View>
    )}
    
    <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
      <Ionicons name="images-outline" size={20} color="#fff" />
      <Text style={styles.pickImageButtonText}>
        {logoUri ? 'Changer le logo' : 'Choisir une image'}
      </Text>
    </TouchableOpacity>
    
    {logoUri && (
      <TouchableOpacity 
        style={styles.removeLogoButton} 
        onPress={() => { setLogoUri(null); setLogo(''); }}
      >
        <Ionicons name="close-circle" size={20} color="#e74c3c" />
        <Text style={styles.removeLogoText}>Retirer</Text>
      </TouchableOpacity>
    )}
  </View>
</View>

   <View style={styles.inputContainer}>
    <Text style={styles.label}>Ville *</Text>
    <View style={styles.pickerContainer}>
        {villes.length === 0 ? (
        <Text style={styles.emptyText}>Aucune ville disponible</Text>
     ) : (
        villes.map((ville) => (
            <TouchableOpacity
            key={ville.id}
            style={[
            styles.pickerItem,
            villeId === ville.id && styles.pickerItemSelected,
            ]}
             onPress={() => setVilleId(ville.id)}
            >
           <Text
           style={[
                        styles.pickerItemText,
                        villeId === ville.id && styles.pickerItemTextSelected,
                      ]}
           >
            {ville.nom}
           </Text>
            </TouchableOpacity>
        ))
    )}

    </View>
    </View>

<View style={styles.inputContainer}>
    <Text style={styles.label}>Catégorie *</Text>
    <View style={styles.pickerContainer}>
        {categories.length === 0 ? (
        <Text style={styles.emptyText}>Aucune catégorie disponible</Text>
     ) : (
        categories.map((cat) => (
            <TouchableOpacity
            key={cat.id}
            style={[
            styles.pickerItem,
            categorieId === cat.id && styles.pickerItemSelected,
            ]}
             onPress={() => setCategorieId(cat.id)}
            >
           <Text
           style={[
           styles.pickerItemText,
           categorieId === cat.id && styles.pickerItemTextSelected,
             ]}
           >
            {cat.icone} {cat.nom}
           </Text>
            </TouchableOpacity>
        ))
    )}
    </View>
    </View>
      <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Création en cours...' : ' Créer mon entreprise'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewLink}
            onPress={() => navigation.navigate('MesEntreprises')}
          >
            <Text style={styles.viewLinkText}>
              Voir mes entreprises existantes
            </Text>
          </TouchableOpacity>
 

    </View>
     </ScrollView>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
 container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
   backBtn: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
 form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#2c3e50',
  },
 textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#007BFF',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#2c3e50',
  },
   pickerItemTextSelected: {
    color: '#fff',
  },
  emptyText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewLinkText: {
    fontSize: 14,
    color: '#007BFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 10,
  },
   backButton: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
  fontSize: 12,
  color: '#95a5a6',
  marginTop: 4,
},
logoContainer: {
  alignItems: 'center',
  marginBottom: 8,
},
logoPreview: {
  width: 120,
  height: 120,
  borderRadius: 60,
  borderWidth: 2,
  borderColor: '#e0e0e0',
  marginBottom: 12,
},
logoPlaceholder: {
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: '#f5f5f5',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#e0e0e0',
  borderStyle: 'dashed',
  marginBottom: 12,
},
logoPlaceholderText: {
  fontSize: 12,
  color: '#ccc',
  marginTop: 4,
},
pickImageButton: {
  backgroundColor: '#007BFF',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
},
pickImageButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
},
removeLogoButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  padding: 6,
},
removeLogoText: {
  color: '#e74c3c',
  fontSize: 14,
},
})
