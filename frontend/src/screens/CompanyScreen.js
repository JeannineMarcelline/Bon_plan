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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';

export default function CompanyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        console.error('Erreur chargement entreprise:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [id]);

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
            <View style={styles.starsContainer}>{renderStars(entreprise.note || 0)}</View>
            <Text style={styles.ratingCount}>0 avis</Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${entreprise.telephone}`)}>
              <Ionicons name="call-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="navigate-outline" size={22} color="#007BFF" />
              <Text style={styles.actionButtonText}>Itinéraire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`whatsapp://send?phone=${entreprise.telephone}`)}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={[styles.actionButtonText, { color: '#25D366' }]}>WhatsApp</Text>
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
});