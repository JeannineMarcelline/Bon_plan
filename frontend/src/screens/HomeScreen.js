import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { categories, entreprises } from '../data/mockData';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');

  const filteredEntreprises = entreprises.filter(ent =>
    ent.nom.toLowerCase().includes(searchText.toLowerCase()) ||
    ent.ville.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Text style={styles.categoryIconText}>{item.icone}</Text>
      </View>
      <Text style={styles.categoryText}>{item.nom}</Text>
    </TouchableOpacity>
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
        <View style={styles.companyRatingContainer}>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#f39c12" />
            <Text style={styles.companyRating}>{item.note}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏝️ Bon Plan</Text>
        <Text style={styles.subtitle}>Madagascar</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une ville ou une entreprise..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#007BFF" />
        </TouchableOpacity>
      </View>

      {/* Catégories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        />
      </View>

      {/* Section Populaires */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔥 Populaires</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des entreprises */}
      <FlatList
        data={filteredEntreprises}
        renderItem={renderCompany}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    paddingVertical: 6,
    marginLeft: 10,
  },
  filterButton: {
    padding: 6,
  },
  categoriesContainer: {
    marginVertical: 5,
  },
  categoriesContent: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryText: {
    fontSize: 11,
    color: '#2c3e50',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  seeAll: {
    fontSize: 14,
    color: '#007BFF',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  companyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  companyImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  companyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  companyVille: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  companyCategorie: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  companyRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyRating: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 2,
  },
});