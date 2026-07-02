import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { entreprises, avis } from '../data/mockData';

export default function CompanyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const entreprise = entreprises.find(e => e.id === id);
  const avisEntreprise = avis.filter(a => a.entrepriseId === id);

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Entreprise non trouvée</Text>
      </SafeAreaView>
    );
  }

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

  const renderAvis = ({ item }) => (
    <View style={styles.avisItem}>
      <View style={styles.avisHeader}>
        <Text style={styles.avisNom}>{item.nomClient}</Text>
        <View style={styles.avisStars}>{renderStars(item.note)}</View>
      </View>
      <Text style={styles.avisCommentaire}>{item.commentaire}</Text>
      <Text style={styles.avisDate}>{item.date}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: entreprise.photo }} style={styles.image} />
          <View style={styles.imageOverlay} />
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <Text style={styles.nom}>{entreprise.nom}</Text>
          <Text style={styles.categorie}>{entreprise.categorie}</Text>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>{renderStars(entreprise.note)}</View>
            <Text style={styles.ratingCount}>{avisEntreprise.length} avis</Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="navigate-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Itinéraire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={[styles.actionButtonText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <Text style={styles.description}>{entreprise.description}</Text>
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
              <Text style={styles.infoText}>{entreprise.horaires}</Text>
            </View>
            {entreprise.siteWeb && (
              <TouchableOpacity style={styles.infoItem}>
                <Ionicons name="globe-outline" size={18} color="#007BFF" />
                <Text style={[styles.infoText, styles.websiteText]}>{entreprise.siteWeb}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bouton Réserver */}
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => navigation.navigate('Booking', { id: entreprise.id })}
          >
            <Ionicons name="calendar-outline" size={22} color="#fff" />
            <Text style={styles.bookButtonText}>Réserver maintenant</Text>
          </TouchableOpacity>

          {/* Avis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Avis des clients</Text>
            {avisEntreprise.length === 0 ? (
              <Text style={styles.noAvis}>Aucun avis pour le moment</Text>
            ) : (
              <FlatList
                data={avisEntreprise}
                renderItem={renderAvis}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
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
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  avisItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  avisNom: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  avisStars: {
    flexDirection: 'row',
  },
  avisCommentaire: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  avisDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  noAvis: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    paddingVertical: 20,
  },
});