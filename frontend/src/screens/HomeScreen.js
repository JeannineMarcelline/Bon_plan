import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { initOfflineCache, setCacheEntreprises, getCacheEntreprises } from '../database/Offlinecache';


function calcReduction(prixNormal, prixPromo) {
  if(!prixNormal || !prixPromo) return 0;
  return Math.round((1 - prixPromo / prixNormal) * 100);
}

const PromoCard = memo(function PromoCard({promo, onPress}) {
const reduction = calcReduction(promo.prix_produit, promo.prix_promo);
const joursRestants = Math.ceil(
  (new Date(promo.date_fin_promo) - new Date()) / (1000 * 60 * 60 * 24)
);

return(
<TouchableOpacity
 style={styles.promoCard}
 onPress={onPress}
activeOpacity={0.85}
>
 <View style={styles.promoImageWrap}>
        {promo.photos_produit?.[0] ? (
          <Image
            source={{ uri: promo.photos_produit[0] }}
            style={styles.promoImage}
          />
        ) : (
          <View style={[styles.promoImage, styles.promoImagePlaceholder]}>
            <Ionicons name="image-outline" size={26} color="#9CA3AF" />
          </View>
        )}
 <View style={styles.promoBadge}>
          <Ionicons name="pricetag" size={10} color="#fff" />
          <Text style={styles.promoBadgeText}>-{reduction}%</Text>
        </View>
      </View>

      {/* Nom produit */}
      <Text style={styles.promoNom} numberOfLines={1}>
        {promo.nom_produit}
      </Text>
<Text style={styles.promoEntreprise} numberOfLines={1}>
        {promo.entreprises?.nom || '—'}
      </Text>

      {/* Prix */}
      <View style={styles.promoPrixRow}>
        <Text style={styles.promoPrixOld}>
          {Number(promo.prix_produit).toLocaleString('fr-FR')} Ar
        </Text>
        <Text style={styles.promoPrixNew}>
          {Number(promo.prix_promo).toLocaleString('fr-FR')} Ar
        </Text>
      </View>
   {joursRestants > 0 && (
        <Text style={styles.promoJours}>
          {joursRestants === 1
            ? 'Dernier jour'
            : `Encore ${joursRestants} jours`}
        </Text>
   )}

</TouchableOpacity>
);
});

// ⭐ CARTE PROMO — PLEINE LARGEUR (1 seule promo)
const PromoCardFull = memo(function PromoCardFull({ promo, onPress }) {
  const reduction = calcReduction(promo.prix_produit, promo.prix_promo);
  const joursRestants = Math.ceil(
    (new Date(promo.date_fin_promo) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <TouchableOpacity
      style={styles.promoCardFull}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Image à gauche */}
      <View style={styles.promoFullImgWrap}>
        {promo.photos_produit?.[0] ? (
          <Image
            source={{ uri: promo.photos_produit[0] }}
            style={styles.promoFullImg}
          />
        ) : (
          <View style={[styles.promoFullImg, styles.promoImagePlaceholder]}>
            <Ionicons name="image-outline" size={26} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.promoBadge}>
          <Ionicons name="pricetag" size={10} color="#fff" />
          <Text style={styles.promoBadgeText}>-{reduction}%</Text>
        </View>
      </View>

      {/* Contenu à droite */}
      <View style={styles.promoFullContent}>
        <Text style={styles.promoNom} numberOfLines={1}>
          {promo.nom_produit}
        </Text>
        <Text style={styles.promoEntreprise} numberOfLines={1}>
          {promo.entreprises?.nom || '—'}
        </Text>

        <View style={styles.promoPrixRow}>
          <Text style={styles.promoPrixOld}>
            {Number(promo.prix_produit).toLocaleString('fr-FR')} Ar
          </Text>
          <Text style={styles.promoPrixNew}>
            {Number(promo.prix_promo).toLocaleString('fr-FR')} Ar
          </Text>
        </View>

        {joursRestants > 0 && (
          <View style={styles.promoJoursWrap}>
            <Ionicons name="time-outline" size={11} marginTop='7' color="#EF4444" />
            <Text style={styles.promoJours}>
              {joursRestants === 1
                ? 'Dernier jour'
                : `Encore ${joursRestants} jours`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {

const [entreprises, setEntreprises] = useState([]);
const [loading, setLoading] = useState(true);
const [selectedCategory, setSelectedCategory] = useState(null);
const [categoriesList, setCategoriesList] = useState([]);
const [filtrePromo, setFiltrePromo] = useState(false);

const navigation = useNavigation();
const [searchText, setSearchText] = useState('');

const [filtersVisible, setFiltersVisible] = useState(false);
const [selectedVille, setSelectedVille] = useState('');
const [minNote, setMinNote] = useState(0);
const [maxPrix, setMaxPrix] = useState(null);
const [villesList, setViillesList] = useState([]);
const [promos, setPromos] = useState([]);
const [entreprisesEnPromo, setEntreprisesEnPromo] = useState([]);
const [prixMinParEntreprise, setPrixMinParEntreprise] = useState({});


// ⭐ Compte des filtres actifs (pour badge et bandeau)
const nbFiltresActifs = [
  selectedVille !== '' ? selectedVille : null,
  minNote > 0 ? minNote : null,
  maxPrix !== null ? maxPrix : null,
].filter(Boolean).length;



const filteredEntreprises = entreprises.filter((item) => {
  const nom = item.nom || '';
  const ville = item.ville || '';
  const categorie = item.categorie || '';

  const matchText =
    nom.toLowerCase().includes(searchText.toLocaleLowerCase()) ||
    ville.toLowerCase().includes(searchText.toLocaleLowerCase()) ||
    categorie.toLowerCase().includes(searchText.toLocaleLowerCase());

  const matchVille = selectedVille ? item.ville === selectedVille : true;
  const matchCategory = selectedCategory ? categorie === selectedCategory : true;
 const matchNote = minNote > 0 ? (item.note_moyenne || 0) >= minNote : true;


   // ⭐ Filtre "En promo"
  const matchPromo = filtrePromo ? entreprisesEnPromo.includes(item.id) : true;

  // ⭐ Filtre prix (basé sur le prix MIN des produits)
  const prixMinEntreprise = prixMinParEntreprise[item.id];
  const matchPrixFiltre = maxPrix
    ? prixMinEntreprise != null && prixMinEntreprise <= maxPrix
    : true;

  return (
    matchText &&
    matchCategory &&
    matchVille &&
    matchNote &&
    matchPromo &&
    matchPrixFiltre
  );
});


const loadPromos = useCallback(async () => {
try{
  const maintenant = new Date().toISOString();

  const { data, error } = await supabase
  .from('produits')
  .select(`
     id,
        nom_produit,
        prix_produit,
        prix_promo,
        date_fin_promo,
        photos_produit,
        id_entreprise,
        entreprises!inner (
          id,
          nom,
          logo,
          statutvalidation
        )
    `)
     .not('prix_promo', 'is', null)
      .not('date_debut_promo', 'is', null)
      .not('date_fin_promo', 'is', null)
      .lte('date_debut_promo', maintenant)
      .gte('date_fin_promo', maintenant)
      .eq('actif', true)
      .eq('entreprises.statutvalidation', 'valide')
      .order('date_fin_promo', { ascending: true })
      .limit(10);

  if(error) throw error;
  setPromos(data || []);

   const idsUniques = [
      ...new Set(
        (data || [])
          .map((p) => p.entreprises?.id || p.id_entreprise)
          .filter(Boolean)
      ),
    ];
    setEntreprisesEnPromo(idsUniques);

}catch(error){
console.error('Erreur de chargement de promos:', error);
setPromos([]);
}
}, []);

const loadCategories = async () => {
  try {
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('nom');

    if (error) throw error;
    setCategoriesList(data);
  } catch (error) {
    console.error('Erreur chargement catégories:', error);
  }
}; 

useEffect(() => {
  initOfflineCache();
}, [])


useFocusEffect(
  React.useCallback(() => {
    loadEntreprises();
    loadVilles();
    loadCategories(); 
    loadPromos();
  }, [])
);
 

 const loadEntreprises = async () => {
  try {

    const netState = await NetInfo.fetch();

    if(!netState.isConnected) {
      const cached = await getCacheEntreprises();
      setEntreprises(cached);
      setLoading(false);
      return;
    }
   
    const { data, error } = await supabase
      .from('entreprises')
      .select(`
        *,
        villes ( nom ),
        categories ( nom ),
        avis ( note )
      `)
      .eq('statutvalidation', 'valide')
      .order('id', { ascending: false });

    if (error) throw error;

   const { data: prixData, error: prixError } = await supabase
      .from('produits')
      .select('id_entreprise, prix_produit')
      .eq('actif', true);

    if (prixError) console.error('Erreur prix min:', prixError);

    const prixMap = {};
    (prixData || []).forEach((p) => {
      const id = p.id_entreprise;
      const prix = Number(p.prix_produit);
      if (!prixMap[id] || prix < prixMap[id]) {
        prixMap[id] = prix;
      }
    });
    setPrixMinParEntreprise(prixMap); 

 
    const entreprisesAvecStats = (data || []).map((e) => {
      const notes = e.avis || [];
      const note_moyenne =
        notes.length > 0
          ? notes.reduce((somme, a) => somme + a.note, 0) / notes.length
          : 0;

      return {
        ...e,
       
        ville: e.villes?.nom || '',
        categorie: e.categories?.nom || '',
        note_moyenne,
        nb_avis: notes.length,
      };
    });

    setEntreprises(entreprisesAvecStats);
    await setCacheEntreprises(entreprisesAvecStats);
  } catch (error) {
    console.error('Erreur chargement entreprises:', error);
    const cached = await getCacheEntreprises();
    setEntreprises(cached);
  } finally {
    setLoading(false);
  }
};
  const loadVilles = async() => {
  try{
    const { data, error } = await supabase
      .from('entreprises')
      .select('villes ( nom )')
      .eq('statutvalidation', 'valide');

    if (error) throw error;

    const toutesLesVilles = (data || [])
      .map((item) => item.villes?.nom)
      .filter(Boolean); 
    const villesUniques = [...new Set(toutesLesVilles)].sort();

    setViillesList(villesUniques);
  }catch(error){
     console.error("Erreur de chargement de ville: ", error)
  }
  } 

  useFocusEffect(
    React.useCallback(() => {
      loadEntreprises();
      loadVilles();
      loadPromos();
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
    setMaxPrix(null);
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
         
          <TouchableOpacity
            style={[
              styles.categoryButton,
              styles.promoFilterButton,
              filtrePromo && styles.promoFilterButtonActive,
            ]}
            onPress={() => setFiltrePromo(!filtrePromo)}
            activeOpacity={0.8}
          >
            <View style={styles.promoFilterContent}>
              <Ionicons
                name="pricetag"
                size={12}
                color={filtrePromo ? '#fff' : '#B45309'}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  styles.promoFilterText,
                  filtrePromo && styles.promoFilterTextActive,
                ]}
              >
                En promo
              </Text>
            </View>
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

      {/* ⭐ Bandeau filtres actifs */}
      {nbFiltresActifs > 0 && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersLabel}>Filtres :</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {selectedVille !== '' && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => setSelectedVille('')}
              >
                <Ionicons name="location-outline" size={12} color="#1E3A5F" />
                <Text style={styles.activeFilterChipText}>{selectedVille}</Text>
                <Ionicons name="close" size={12} color="#6B7280" />
              </TouchableOpacity>
            )}

            {minNote > 0 && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => setMinNote(0)}
              >
                <Ionicons name="star-outline" size={12} color="#1E3A5F" />
                <Text style={styles.activeFilterChipText}>Note {minNote}+</Text>
                <Ionicons name="close" size={12} color="#6B7280" />
              </TouchableOpacity>
            )}

            {maxPrix !== null && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => setMaxPrix(null)}
              >
                <Ionicons name="cash-outline" size={12} color="#1E3A5F" />
                <Text style={styles.activeFilterChipText}>
                  ≤ {maxPrix.toLocaleString('fr-FR')} Ar
                </Text>
                <Ionicons name="close" size={12} color="#6B7280" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

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
        ListHeaderComponent={
          <>
            {promos.length > 0 ? (
              <View style={styles.promoSection}>
                <View style={styles.promoHeader}>
                  <View style={styles.promoHeaderLeft}>
                    <View style={styles.sectionIcon} />
                    <Text style={styles.promoTitle}>Bons plans du moment</Text>
                  </View>
                </View>

                {promos.length === 1 ? (
                  <View style={styles.promoFullWrap}>
                    <PromoCardFull
                      promo={promos[0]}
                      onPress={() =>
                        navigation.navigate('Company', {
                          id: promos[0].entreprises?.id || promos[0].id_entreprise,
                        })
                      }
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.promoScroll}
                  >
                    {promos.map((p) => (
                      <PromoCard
                        key={p.id}
                        promo={p}
                        onPress={() =>
                          navigation.navigate('Company', {
                            id: p.entreprises?.id || p.id_entreprise,
                          })
                        }
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}

            {/* ⭐ Label "Toutes les entreprises" */}
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>
                {selectedCategory
                  ? selectedCategory
                  : 'Toutes les entreprises'}
              </Text>
              <Text style={styles.sectionLabelCount}>
                {filteredEntreprises.length}
              </Text>
            </View>
          </>
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
                        <TouchableOpacity
            onPress={() => setFiltersVisible(true)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={24} color="#1E3A5F" />
            {/* ⭐ Badge count */}
            {nbFiltresActifs > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{nbFiltresActifs}</Text>
              </View>
            )}
          </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                <Ionicons name="location-outline" size={16} color="#1E3A5F" />
                <Text style={styles.filterLabel}>Ville</Text>
              </View>
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
              <View style={styles.filterLabelRow}>
                <Ionicons name="star-outline" size={16} color="#1E3A5F" />
                <Text style={styles.filterLabel}>Note minimum</Text>
              </View>
              <View style={styles.ratingFilter}>
                {[0, 1, 2, 3, 4, 5].map((note) => (
                  <TouchableOpacity
                    key={note}
                    style={[styles.starButton, minNote === note && styles.starButtonActive]}
                    onPress={() => setMinNote(minNote === note ? 0 : note)}
                  >
                    <Text style={[styles.starText, minNote === note && styles.starTextActive]}>
                      {note === 0 ? 'Tous' : `${note}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ⭐ Filtre PRIX */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="cash-outline" size={16} color="#1E3A5F" />
                <Text style={styles.filterLabel}>Prix maximum</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.prixOptions}
              >
                {[
                  { label: 'Tous', value: null },
                  { label: '≤ 20 000', value: 20000 },
                  { label: '≤ 50 000', value: 50000 },
                  { label: '≤ 100 000', value: 100000 },
                  { label: '≤ 500 000', value: 500000 },
                ].map((option) => {
                  const selected = maxPrix === option.value;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.prixChip,
                        selected && styles.prixChipActive,
                      ]}
                      onPress={() => setMaxPrix(option.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.prixChipText,
                          selected && styles.prixChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
    backgroundColor: '#093875',
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

  // BONS PLANS DU MOMENT
    promoSection: {
    backgroundColor: '#f4f4f4',
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#d7e2f0',
    borderBottomWidth: 1,
    borderBottomColor: '#d7e2f0',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  promoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A5F',
    letterSpacing: 0.3,
  },
  promoCount: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  promoCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  promoScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },

  promoCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  promoImageWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  promoImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  promoImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  promoNom: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  promoEntreprise: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  promoPrixRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  promoPrixOld: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  promoPrixNew: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
    promoJours: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 6,
  },

  // ⭐ CARTE PROMO PLEINE LARGEUR (1 seule promo)
  promoFullWrap: {
    paddingHorizontal: 16,
  },
  promoCardFull: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  promoFullImgWrap: {
    width: 110,
    height: 110,
    borderRadius: 12,
    position: 'relative',
    flexShrink: 0,
  },
  promoFullImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  promoFullContent: {
    flex: 1,
    justifyContent: 'center',
  },
   promoJoursWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },

  // ⭐ Label section "Toutes les entreprises"
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionLabelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A5F',
    letterSpacing: 0.2,
  },
  sectionLabelCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  // ⭐ Filtre "En promo"
  promoFilterButton: {
    backgroundColor: '#fffdf7',
    borderWidth: 1,
    borderColor: '#fef1bd',
  },
  promoFilterButtonActive: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },
  promoFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promoFilterText: {
    color: '#B45309',
    fontWeight: '700',
  },
    promoFilterTextActive: {
    color: '#fff',
  },

  // ⭐ MODALE FILTRE — Labels avec icônes
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },

  // ⭐ Filtre PRIX
  prixOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  prixChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  prixChipActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  prixChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  prixChipTextActive: {
    color: '#fff',
  },
    categoriesSeparator: {
    width: 1,
    height: 22,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
    alignSelf: 'center',
  },

  // ⭐ Badge count sur ⚙️
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // ⭐ Bandeau filtres actifs
  activeFiltersBar: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingVertical: 8,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
    marginRight: 8,
  },
  activeFiltersScroll: {
    gap: 6,
    paddingRight: 16,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A5F',
  },
});




