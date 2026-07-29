import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert, 
  Share
} from 'react-native';
import MapView, {Marker} from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';
import { useAuth } from "../context/AuthContext";

export default function CompanyScreen() {
  const {user} = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avisList, setAvisList] = useState([]);
  const [noteMoyenne, setNoteMoyenne] = useState(0);
  const [nbAvis, setNbAvis] = useState(0);


  // fonction pour l'avis
   const loadAvis = async (entrepriseId) => {
  try {
    const result = await db.getAllAsync(`
      SELECT avis.*, utilisateurs.nom as nom_utilisateur
      FROM avis
      LEFT JOIN utilisateurs ON avis.id_utilisateur = utilisateurs.id
      WHERE avis.id_entreprise = ?
      ORDER BY avis.date_avis DESC
    `, [entrepriseId]);
    setAvisList(result);

    const count = result.length;
    setNbAvis(count);
    if(count > 0 ) {
      const total = result.reduce((sum, avis ) => sum + avis.note, 0);
      const moyenne = total / count;
      setNoteMoyenne(moyenne);
    }else{
      setNoteMoyenne(0)
    }
  } catch (error) {
    console.error('Erreur chargement avis:', error);
  }
};

  const submitAvis = async () => {
    if (!user) {
    Alert.alert('Erreur', 'Vous devez être connecté pour laisser un avis');
    return;
  }
   if(note === 0 ) {
    Alert.alert('Erreur', 'Veuillez selectionner une note ');
    return;
   }
   setSubmitting(true);
    try{
      await db.runAsync('INSERT INTO avis (id_utilisateur, id_entreprise, note, commentaire ) VALUES (?, ?, ?, ?)',
        [user.id, entreprise.id,note, commentaire]
      );
   Alert.alert('Succès', 'L\'avis est bien insérer ');
   setNote(0);
   setCommentaire('');
   await loadAvis(entreprise.id);
    }catch(error){
     console.error('Erreur:', error);
     Alert.alert('Erreur', 'impossible d\'enregistré votre avis');
    }finally{
      setSubmitting(false)
    }

  }

  const shareWhatsApp = () => {
  const message = `🏢 *${entreprise.nom}*\n Adresse :  ${entreprise.adresse}\n Téléphone:  ${entreprise.telephone}\n Note : ${noteMoyenne.toFixed(1)}/5\n\n`;
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('Erreur', 'WhatsApp n\'est pas installé sur votre téléphone');
  });

  }

  // Charger les données réelles de l'entreprise
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const result = await db.getAllAsync(`
          SELECT e.*, v.nom as ville, c.nom as categorie
          FROM entreprises e
          LEFT JOIN villes v ON e.ville_id = v.id
          LEFT JOIN categories c ON e.categorie_id = c.id
          WHERE e.id = ?
        `, [id]);
        if (result.length > 0) {
          setEntreprise(result[0]);
          await loadAvis(result[0].id);
        }
      } catch (error) {
        console.error('Erreur chargement entreprise:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
   
  }, [id]);

  useEffect (() => {
    (async () => {
       const {status} = await Location.requestForegroundPermissionsAsync();
       if ( status !== "granted") {
        Alert.alert('Permission refusée', 'Activer la localsation pour voir l\'itinéraire');
        return;
       }
    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
})();

}, []);

  // Afficher les étoiles
  const renderStars = (note) => {
    let stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < Math.floor(note) ? 'star' : i < note ? 'star-half' : 'star-outline'}
          size={18}
          color="#f39c12"
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Entreprise non trouvée</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Image de couverture */}
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: entreprise.logo || 'https://via.placeholder.com/400x200' }}
            style={styles.image}
          />
          <View style={styles.imageOverlay} />
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <Text style={styles.nom}>{entreprise.nom}</Text>
          <Text style={styles.categorie}>{entreprise.categorie}</Text>
 
           <View style={styles.ratingContainer}>
           <View style={styles.starsContainer}>
             {renderStars(noteMoyenne)}
          </View>
          <Text style={styles.ratingCount}>
             ({nbAvis} avis)
          </Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${entreprise.telephone}`)}>
              <Ionicons name="call-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Appeler</Text>
            </TouchableOpacity>
               {userLocation && entreprise && (
                 <TouchableOpacity 
                 style={styles.actionButton}
                 onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${entreprise.latitude || -21.4526},${entreprise.longitude || 47.0855}`;
              Linking.openURL(url);
    }}
                 >
              <Ionicons name="navigate-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Itinéraire</Text>
            </TouchableOpacity>

               )}
               
          <TouchableOpacity style={styles.actionButton} onPress={shareWhatsApp}>
          <Ionicons name="share-social-outline" size={22} color="#25D366" />
          <Text style={[styles.actionButtonText, { color: '#25D366' }]}>Partager</Text>
           </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <Text style={styles.description}>{entreprise.description || 'Aucune description'}</Text>
          </View>

          {/* Informations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Informations</Text>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={18} color="#7f8c8d" />
              <Text style={styles.infoText}>{entreprise.adresse}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={18} color="#7f8c8d" />
              <Text style={styles.infoText}>{entreprise.telephone}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color="#7f8c8d" />
              <Text style={styles.infoText}>{entreprise.horaires || 'Non renseigné'}</Text>
            </View>
            {entreprise.siteWeb && (
              <TouchableOpacity style={styles.infoItem} onPress={() => Linking.openURL(`https://${entreprise.siteWeb}`)}>
                <Ionicons name="globe-outline" size={18} color="#007BFF" />
                <Text style={[styles.infoText, styles.websiteText]}>{entreprise.siteWeb}</Text>
              </TouchableOpacity>
            )}
          </View>
          {/** formulaire de l'avis */}
          {user && (
           <View  style={styles.section}>
            <Text style={styles.sectionTitle}>Donner votre avis </Text>
              <View style={styles.starsContainer}>
               {[1, 2, 3, 4, 5].map((stars) => (
                <TouchableOpacity key={stars} onPress={() => setNote(stars)}>
                 <Ionicons
                   name={ stars <= note ? 'star' : 'star-outline'}
                   size={32}
                   color={stars <= note ? '#f39c12' : '#ccc'}
                 />
                </TouchableOpacity>
               ))}
              </View>
               <TextInput
               style={styles.commentInput}
               placeholder='votre commentaire...'
               value={commentaire}
               onChangeText={setCommentaire}
               multiline
               numberOfLines={3}
               />
               <TouchableOpacity style={styles.submitButton} onPress={submitAvis} disabled={submitting} >
                <Text style={styles.submitButtonText}>{submitting ? 'Envoi...' : 'Envoyer mon avis'}</Text>
              </TouchableOpacity> 
           </View>
          )}
         
          {/** Liste des Avis */}
  <View style={styles.section}>
  <Text style={styles.sectionTitle}> Avis des clients</Text>
  {avisList.length === 0 ? (
    <Text style={styles.noAvis}>Aucun avis pour le moment</Text>
  ) : (
    avisList.map((avis) => (
      <View key={avis.id_avis} style={styles.avisCard}>
        <View style={styles.avisHeader}>
          <Text style={styles.avisNom}>{avis.nom_utilisateur || 'Anonyme'}</Text>
          <View style={styles.avisStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= avis.note ? 'star' : 'star-outline'}
                size={16}
                color={star <= avis.note ? '#f39c12' : '#ccc'}
              />
            ))}
          </View>
        </View>
        <Text style={styles.avisCommentaire}>{avis.commentaire}</Text>
        <Text style={styles.avisDate}>{avis.date_avis}</Text>
      </View>
    ))
  )}
</View>
          {/** CARTE */}
          <View style={styles.mapContainer}>
             <MapView
             style={styles.map}
             region={{
              latitude: userLocation?.latitude || -21.4526,
              longitude: userLocation?.longitude || 47.0855,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
             }}
             >
            {/** Marque de l'entreprise */}
            {entreprise.latitude && entreprise.longitude && (
              <Marker
              coordinate={{
                latitude: entreprise.latitude,
                longitude: entreprise.longitude,
              }}
              title={entreprise.nom}
              description={entreprise.adresse}
              />
            )}
            {/** Marque de client */}
            {userLocation && (
            <Marker
            coordinate={userLocation}
            title='Ma position'
            pinColor='blue'
            />
            )}
          </MapView>
          </View>
     
 
          {/* Section spécifique au TRANSPORT */}
          {entreprise.type_activite === 'transport' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚐 Véhicules disponibles</Text>
              <TouchableOpacity
                style={styles.vehiculeButton}
                onPress={() => navigation.navigate('CompanyVehicules', { idEntreprise: entreprise.id })}
              >
                <Ionicons name="bus-outline" size={22} color="#fff" />
                <Text style={styles.vehiculeButtonText}>Voir les véhicules</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section spécifique à l'HÔTEL (exemple pour plus tard) */}
          {entreprise.type_activite === 'hotel' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛏️ Chambres disponibles</Text>
              <Text style={styles.infoText}>Fonctionnalité à venir...</Text>
            </View>
          )}
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
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 30,
    padding: 10,
  },
  content: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  nom: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  categorie: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#95a5a6',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
  },
  websiteText: {
    color: '#007BFF',
  },
  vehiculeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  vehiculeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 50,
  },

  // style de carte 
mapContainer: {
  height: 200,
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 16,
  backgroundColor: '#e9ecef',
},
map: {
  flex: 1,
},
// style de Avis 

starsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 8,
  marginVertical: 12,
},
commentInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 10,
  padding: 12,
  fontSize: 16,
  textAlignVertical: 'top',
  marginBottom: 12,
  backgroundColor: '#fff',
},
submitButton: {
  backgroundColor: '#007BFF',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
},
submitButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
avisCard: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
avisHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
},
avisNom: {
  fontWeight: 'bold',
  fontSize: 14,
  color: '#2c3e50',
},
avisStars: {
  flexDirection: 'row',
},
avisCommentaire: {
  fontSize: 14,
  color: '#555',
  marginVertical: 4,
},
avisDate: {
  fontSize: 12,
  color: '#95a5a6',
},
noAvis: {
  textAlign: 'center',
  color: '#95a5a6',
  fontSize: 14,
  paddingVertical: 20,
},

});