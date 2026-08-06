import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  FlatList,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import db from '../database/database';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {

const [entreprises, setEntreprises] = useState([]);
const [loading, setLoading] = useState(true);
const [selectedCategory, setSelectedCategory] = useState(null);
const [categoriesList, setCategoriesList] = useState([]);

const navigation = useNavigation();
const [searchText, setSearchText] = useState('');

const [filtersVisible, setFiltersVisible] = useState(false);
const [selectedVille, setSelectedVille] = useState('');
const [minNote, setMinNote] = useState(0);
const [maxPrix, setMaxPrix] = useState(1000000);
const [villesList, setViillesList] = useState([]);


const filteredEntreprises = entreprises.filter((item) => {
const nom = item.nom || '' ;
const ville = item.ville || '' ; 
const categorie = item.categorie || '';

const matchText = 
nom.toLowerCase().includes(searchText.toLocaleLowerCase()) || 
ville.toLowerCase().includes(searchText.toLocaleLowerCase()) || 
categorie.toLowerCase().includes(searchText.toLocaleLowerCase()) ;

const matchVille = selectedVille ? item.ville === selectedVille : true;

const matchCategory = selectedCategory ? categorie === selectedCategory : true;

const matchNote = item.note >= minNote;

const matchPrix = item.prix ? item.prix <= maxPrix : true;

return matchText && matchCategory && matchVille && matchNote && matchPrix;

})

const loadCategories = async () => {
  try {
    const result = await db.getAllAsync('SELECT * FROM categories ORDER BY nom');
    setCategoriesList(result);
  } catch (error) {
    console.error('Erreur chargement catégories:', error);
  }
}; 

useFocusEffect(
  React.useCallback(() => {
    loadEntreprises();
    loadVilles();
    loadCategories(); // ← AJOUTE CETTE LIGNE
  }, [])
);
  const renderCategory = ({ item }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Text style={styles.categoryIconText}>{item.icone}</Text>
      </View>
      <Text style={styles.categoryText}>{item.nom}</Text>
    </TouchableOpacity>
  );

 const loadEntreprises = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT e.*, v.nom as ville, c.nom as categorie,
      COALESCE(
        (SELECT AVG(note) FROM avis WHERE avis.id_entreprise = e.id),
        0
      ) as note_moyenne,
      COALESCE(
        (SELECT COUNT(*) FROM avis WHERE avis.id_entreprise = e.id),
        0
      ) as nb_avis
      FROM entreprises e
      LEFT JOIN villes v ON e.ville_id = v.id
      LEFT JOIN categories c ON e.categorie_id = c.id
      WHERE e.statutValidation = 'valide'
      AND e.utilisateur_id IN (SELECT id FROM utilisateurs)
      ORDER BY e.id DESC
    `);
    setEntreprises(result);
  } catch (error) {
    console.error('Erreur chargement entreprises:', error);
  } finally {
    setLoading(false);
  }
};
  const loadVilles = async() => {
  try{
  const result = await db.getAllAsync(`
    SELECT DISTINCT v.nom as ville FROM entreprises e
    LEFT JOIN villes v ON e.ville_id = v.id
    WHERE e.statutValidation = 'valide'
    ORDER BY v.nom
    `);
  setViillesList(result.map(item => item.ville));
  }catch(error){
     console.error("Erreur de chargement de ville: ", error)
  }
  } 

  useFocusEffect(
    React.useCallback(() => {
      loadEntreprises();
      loadVilles();
    }, [])
  );

  const renderCompany = ({ item }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => navigation.navigate('Company', { id: item.id })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photo }} style={styles.companyImage} />
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.nom}</Text>
        <View style={styles.companyMeta}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.companyVille}>{item.ville}</Text>
        </View>
        <View style={styles.companyMeta}>
          <Ionicons name="pricetag-outline" size={14} color="#666" />
          <Text style={styles.companyCategorie}>{item.categorie}</Text>
        </View>
        {item.note_moyenne > 0 ? (
      <Text style={styles.rating}>⭐ {item.note_moyenne.toFixed(1)} ({item.nb_avis} avis)</Text>
   ) : (
     <Text style={styles.ratingEmpty}>Pas encore noté</Text>
  )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const resetFilters = () => {
    setSelectedVille('');
    setMinNote(0);
    setMaxPrix(1000000);
    setSearchText('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header avec logo et barre de recherche */}
      <View style={styles.header}>
        <Image source={require('../../assets/bonPlan.jpg')} style={styles.logo} />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity onPress={() => setFiltersVisible(true)} style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Catégories améliorées sans icônes */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesFilter}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[styles.categoryButton, !selectedCategory && styles.categoryActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryButtonText, !selectedCategory && styles.categoryActiveText]}>Tous</Text>
            {!selectedCategory && <View style={styles.categoryActiveIndicator} />}
          </TouchableOpacity>
         {categoriesList.map((cat) => (
  <TouchableOpacity
    key={cat.id}
    style={[styles.categoryButton, selectedCategory === cat.nom && styles.categoryActive]}
    onPress={() => setSelectedCategory(selectedCategory === cat.nom ? null : cat.nom)}
  >
    <Text style={[styles.categoryButtonText, selectedCategory === cat.nom && styles.categoryActiveText]}>
      {cat.icone} {cat.nom}
    </Text>
  </TouchableOpacity>
))}
       
        </ScrollView>
      </View>

      {/* Liste des entreprises améliorée */}
      <FlatList
        data={filteredEntreprises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Company', { id: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.logo || 'https://via.placeholder.com/80' }} style={styles.image} />
              {item.note_moyenne > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>⭐ {item.note_moyenne.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.nom}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={14} color="#7f8c8d" />
                <Text style={styles.category}>{item.categorie}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#7f8c8d" />
                <Text style={styles.location}>{item.ville}</Text>
              </View>
              {item.note_moyenne > 0 ? (
                <View style={styles.ratingRow}>
                  <View style={styles.starsContainer}>
                    {[1,2,3,4,5].map((star) => (
                      <Text key={star} style={[styles.starIcon, star <= Math.round(item.note_moyenne) && styles.starFilled]}>
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.ratingCount}>({item.nb_avis})</Text>
                </View>
              ) : (
                <Text style={styles.ratingEmpty}>Nouveau</Text>
              )}
            </View>
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View> 
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucune entreprise correspond à votre recherche</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Modal filtre amélioré */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filtersVisible}
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFiltersVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>📍 Ville</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedVille && styles.filterChipActive]}
                  onPress={() => setSelectedVille('')}
                >
                  <Text style={[styles.filterChipText, !selectedVille && styles.filterChipTextActive]}>Toutes</Text>
                </TouchableOpacity>

                {villesList.map((ville) => (
                  <TouchableOpacity
                    key={ville}
                    style={[styles.filterChip, selectedVille === ville && styles.filterChipActive]}
                    onPress={() => setSelectedVille(selectedVille === ville ? '' : ville)}
                  >
                    <Text style={[styles.filterChipText, selectedVille === ville && styles.filterChipTextActive]}>
                      {ville}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>⭐ Note minimum</Text>
              <View style={styles.ratingFilter}>
                {[0, 1, 2, 3, 4].map((note) => (
                  <TouchableOpacity
                    key={note}
                    style={[styles.starButton, minNote === note && styles.starButtonActive]}
                    onPress={() => setMinNote(minNote === note ? 0 : note)}
                  >
                    <Text style={[styles.starText, minNote === note && styles.starTextActive]}>
                      {note === 0 ? 'Tous' : '⭐'.repeat(note)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.resetButton]} onPress={resetFilters}>
                <Ionicons name="refresh-outline" size={18} color="#2c3e50" />
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.applyButton]} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logo: {
    width: 45,
    height: 40,
    resizeMode: 'contain',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
    paddingVertical: 2,
    marginLeft: 8,
  },
  filterButton: {
    padding: 4,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesFilter: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 2,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  categoryActive: {
    backgroundColor: '#1E3A5F',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  categoryActiveText: {
    color: '#fff',
  },
  categoryActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 4,
    height: 20,
    backgroundColor: '#1E3A5F',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  ratingBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  location: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    fontSize: 14,
    color: '#ddd',
    marginRight: 1,
  },
  starFilled: {
    color: '#f39c12',
  },
  ratingCount: {
    fontSize: 12,
    color: '#95a5a6',
  },
  rating: {
    fontSize: 14,
    color: '#f39c12',
    marginTop: 4,
    fontWeight: 'bold',
  },
  ratingEmpty: {
    fontSize: 13,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardArrow: {
    paddingLeft: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  closeButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#1E3A5F',
  },
  filterChipText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  starButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  starButtonActive: {
    backgroundColor: '#1E3A5F',
  },
  starText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  starTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
  },
  applyButton: {
    backgroundColor: '#1E3A5F',
  },
  resetButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});