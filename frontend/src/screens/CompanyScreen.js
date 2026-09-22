import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getConfigCategorie } from '../Config/categorieConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

// ============================================================
// HELPERS & SOUS-COMPOSANTS MÉMOÏSÉS
// Isolés du composant principal pour éviter qu'un simple
// changement d'état (ex: frappe clavier) ne redessine toute
// la liste des produits/avis et la carte à chaque fois.
// ============================================================

function renderStars(n, size = 16) {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i < Math.floor(n) ? 'star' : i < n ? 'star-half' : 'star-outline'}
        size={size}
        color="#f39c12"
      />
    );
  }
  return stars;
}

// La MapView est le composant natif le plus coûteux de l'écran.
// Avant : elle recevait un objet `region` recréé à chaque render
// du parent (donc à chaque frappe dans le champ commentaire),
// ce qui forçait React Native à la re-render inutilement.
// Ici, elle est isolée et ne se re-render que si lat/lng changent.
const CompanyMapPreview = memo(function CompanyMapPreview({
  latitude,
  longitude,
  onPress,
}) {
  const region = useMemo(
    () => ({
      latitude: latitude || -21.4526,
      longitude: longitude || 47.0855,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }),
    [latitude, longitude]
  );

  return (
    <TouchableOpacity
      style={styles.locationCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MapView
        style={styles.locationMap}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
        region={region}
      >
        {latitude && longitude && (
          <Marker coordinate={{ latitude, longitude }} />
        )}
      </MapView>

      <View style={styles.locationOverlay}>
        <Ionicons name="navigate" size={14} color="#fff" />
        <Text style={styles.locationOverlayText}>Voir sur la carte</Text>
      </View>
    </TouchableOpacity>
  );
});

// Une ligne de produit ne se re-render que si SES props changent,
// pas quand l'utilisateur tape un commentaire ou change de date.
const ProductRow = memo(function ProductRow({
  produit,
  estComplet,
  motsProduit,
  onOpen,
}) {
  const handlePress = useCallback(() => {
    if (estComplet) {
      Alert.alert(
        'Non disponible',
        `"${produit.nom_produit}" est complet à ces dates. Essayez d'autres dates.`
      );
      return;
    }
    onOpen(produit);
  }, [estComplet, produit, onOpen]);

  return (
    <TouchableOpacity
      style={[styles.produitCard, estComplet && styles.produitRowComplet]}
      onPress={handlePress}
      activeOpacity={estComplet ? 1 : 0.7}
    >
      {produit.photos_produit && produit.photos_produit.length > 0 ? (
        <Image
          source={{ uri: produit.photos_produit[0] }}
          style={[styles.produitThumb, estComplet && { opacity: 0.4 }]}
        />
      ) : (
        <View
          style={[
            styles.produitThumb,
            styles.produitThumbPlaceholder,
            estComplet && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
        </View>
      )}

      <View style={styles.produitInfo}>
        <Text
          style={[styles.produitName, estComplet && { color: '#9CA3AF' }]}
          numberOfLines={1}
        >
          {produit.nom_produit}
        </Text>
        <Text style={styles.produitDetails} numberOfLines={1}>
          {estComplet
            ? '❌ Complet à ces dates'
            : produit.description_pro || `${motsProduit} disponible`}
        </Text>
      </View>

      <View style={styles.produitPriceBlock}>
        <Text style={[styles.produitPrice, estComplet && { color: '#9CA3AF' }]}>
          {Number(produit.prix_produit).toLocaleString('fr-FR')} Ar
        </Text>
        <Text style={styles.produitPriceSub}>par unité</Text>
      </View>
    </TouchableOpacity>
  );
});

// Idem pour les avis : mémoïsés pour ne pas recalculer/re-render
// toute la liste à chaque changement local du formulaire.
const AvisItem = memo(function AvisItem({ avis }) {
  return (
    <View style={styles.avisItem}>
      <View style={styles.avisHeader}>
        <View style={styles.avisAuthorRow}>
          <View style={styles.avisAvatar}>
            <Text style={styles.avisAvatarText}>
              {avis.nom_utilisateur?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.avisNom}>{avis.nom_utilisateur}</Text>
        </View>
        <View style={styles.avisStars}>{renderStars(avis.note, 12)}</View>
      </View>
      <Text style={styles.avisCommentaire}>{avis.commentaire}</Text>
      <Text style={styles.avisDate}>
        {new Date(avis.date_avis).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </Text>
    </View>
  );
});

function formatDateFr(date) {
  if (!date) return null;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CompanyScreen() {
  const { user } = useAuth();
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
  const [produits, setProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);

  const [produitSelectionne, setProduitSelectionne] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateDebut, setDateDebut] = useState(null);
  const [dateFin, setDateFin] = useState(null);
  const [showPickerDebut, setShowPickerDebut] = useState(false);
  const [showPickerFin, setShowPickerFin] = useState(false);
  const [rechercheFaite, setRechercheFaite] = useState(false);


  const { addToCart } = useCart();

  const config = useMemo(
    () => getConfigCategorie(entreprise?.categorie || null),
    [entreprise?.categorie]
  );
  const mots = config.vocabulaire;
  const besoinDuree = config.besoinDuree;


  const loadProduits = useCallback(async (entrepriseId, debut = null, fin = null) => {
    try {

      setLoadingProduits(true);

      const {data, error} = await supabase.rpc(
        'produits_disponibles_pour_dates',{
          p_id_entreprise: entrepriseId,
          p_date_debut: debut ? debut.toISOString() : null,
          p_date_fin : fin ? fin.toISOString() : null,
        }
      );

      if (error) throw error;

      setProduits(data || []);

    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoadingProduits(false);
    }
  }, []);

  const loadAvis = useCallback(async (entrepriseId) => {
    try {
      const { data, error } = await supabase
        .from('avis')
        .select('*, utilisateurs (nom)')
        .eq('id_entreprise', entrepriseId)
        .order('date_avis', { ascending: false });

      if (error) throw error;

      const result = (data || []).map((a) => ({
        ...a,
        nom_utilisateur: a.utilisateurs?.nom || 'Anonyme',
      }));

      setAvisList(result);
      setNbAvis(result.length);

      if (result.length > 0) {
        const total = result.reduce((sum, a) => sum + a.note, 0);
        setNoteMoyenne(total / result.length);
      } else {
        setNoteMoyenne(0);
      }
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    }
  }, []);

  const submitAvis = useCallback(async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour laisser un avis');
      return;
    }
    if (note === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('avis').insert({
        id_utilisateur: user.id,
        id_entreprise: entreprise.id,
        note,
        commentaire,
      });
      if (error) throw error;

      Alert.alert('Succès', "L'avis a bien été enregistré");
      setNote(0);
      setCommentaire('');
      await loadAvis(entreprise.id);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer votre avis");
    } finally {
      setSubmitting(false);
    }
  }, [user, note, commentaire, entreprise, loadAvis]);


  const shareWhatsApp = useCallback(() => {
    const message = `🏢 *${entreprise.nom}*\nAdresse : ${entreprise.adresse}\nTéléphone : ${entreprise.telephone}\nNote : ${noteMoyenne.toFixed(1)}/5\n\n`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', "WhatsApp n'est pas installé");
    });
  }, [entreprise, noteMoyenne]);

  const openItineraire = useCallback(() => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.latitude || ''},${userLocation?.longitude || ''}&destination=${entreprise.latitude || -21.4526},${entreprise.longitude || 47.0855}`;
    Linking.openURL(url);
  }, [userLocation, entreprise]);

  const onChangeDateDebut = useCallback((event, selectedDate) => {
  if (Platform.OS === 'android') setShowPickerDebut(false);
  if (event.type === 'dismissed') return;
  if (selectedDate) {
    setDateDebut(selectedDate);

    setDateFin((prevFin) => (prevFin && prevFin < selectedDate ? null : prevFin));
  }
 }, []);

 const onChangeDateFin = useCallback((event, selectedDate) => {
  if(Platform.OS === 'android') setShowPickerFin(false);
  if(event.type === 'dismissed') return;
  if(selectedDate) setDateFin(selectedDate);
}, []);

const handleRechercher = useCallback(async () => {
  if(!dateDebut || !dateFin) {
    Alert.alert(
      'Dates manquantes',
      'Veuillez sélectionner la date de début et la date de fin '
    );
    return;
  }

 if(dateFin < dateDebut) {
  Alert.alert('Date incohérentes', 'La date de fin doit être après la date de début');
  return;
 }

 setRechercheFaite(true);
 await loadProduits(entreprise.id, dateDebut, dateFin);

}, [dateDebut, dateFin, entreprise, loadProduits]);

const effacerRecherche = useCallback(async () => {
  setDateDebut(null);
  setDateFin(null);
  setRechercheFaite(false);
  await loadProduits(entreprise.id);
}, [entreprise, loadProduits]);


  const ouvrirModale = useCallback((produit) => {
    setProduitSelectionne(produit);
    setModalVisible(true);
  }, []);

  const fermerModale = useCallback(() => {
    setModalVisible(false);
    setProduitSelectionne(null);
  }, []);

const handleActionProduit = useCallback((produit) => {
  if (besoinDuree) {
    fermerModale();
    navigation.navigate('Order', {
      produitDirect: {
        id: produit.id,
        nom_produit: produit.nom_produit,
        prix_produit: produit.prix_produit,
        quantite: 1,
        photos_produit: produit.photos_produit,
      },
      idEntreprise: entreprise.id,
      // On passe les dates si elles ont été choisies
      dateDebut: dateDebut ? dateDebut.toISOString() : null,
      dateFin: dateFin ? dateFin.toISOString() : null,
    });
  } else {
    addToCart(produit);
    fermerModale();
    Alert.alert(
      '🛒 Ajouté',
      `${produit.nom_produit} a été ajouté à votre ${mots.panier}`
    );
  }
}, [besoinDuree, navigation, entreprise, dateDebut, dateFin, addToCart, mots, fermerModale]);

  // ============================================================
  // CHARGEMENT ENTREPRISE
  // ============================================================
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('entreprises')
          .select('*, villes(nom), categories(nom)')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const e = {
            ...data,
            ville: data.villes?.nom || '',
            categorie: data.categories?.nom || '',
          };
          setEntreprise(e);
          // Avis et produits ne dépendent pas l'un de l'autre :
          // on les charge en parallèle plutôt qu'en série pour
          // diviser le temps d'attente par ~2.
          await Promise.all([loadAvis(e.id), loadProduits(e.id)]);
        }
      } catch (error) {
        console.error('Erreur chargement entreprise:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [id, loadAvis, loadProduits]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const keyExtractorProduit = useCallback((item) => String(item.id), []);

  const renderProduitItem = useCallback(
    ({ item }) => (
      <ProductRow
        produit={item}
        estComplet={rechercheFaite && (item.places_restantes || 0) <= 0}
        motsProduit={mots.produit}
        onOpen={ouvrirModale}
      />
    ),
    [rechercheFaite, mots.produit, ouvrirModale]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Entreprise non trouvée</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={produits}
        keyExtractor={keyExtractorProduit}
        renderItem={renderProduitItem}
        showsVerticalScrollIndicator={false}
        // ---- Réglages de virtualisation ----
        // Seuls les produits proches de l'écran sont montés en mémoire ;
        // le reste est "recyclé" au fil du scroll, comme une vraie liste native.
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        ListHeaderComponent={
          <>
            <View style={styles.imageContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{
                  uri: entreprise.logo || 'https://via.placeholder.com/400x300',
                }}
                style={styles.image}
              />
              <View style={styles.imageOverlay} />
            </View>

            <View style={styles.headerSection}>
              <Text style={styles.nom}>{entreprise.nom}</Text>
              <Text style={styles.categorie}>{entreprise.categorie}</Text>

              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>{renderStars(noteMoyenne, 16)}</View>
                <Text style={styles.ratingText}>({nbAvis} avis)</Text>
              </View>

              {/* Boutons d'action */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${entreprise.telephone}`)}
                >
                  <Ionicons name="call-outline" size={20} color="#2563EB" />
                  <Text style={styles.actionBtnText}>Appeler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={openItineraire}>
                  <Ionicons name="navigate-outline" size={20} color="#2563EB" />
                  <Text style={styles.actionBtnText}>Itinéraire</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={shareWhatsApp}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={20}
                    color="#10B981"
                  />
                  <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
                    Partager
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Description</Text>
                <Text style={styles.cardText}>
                  {entreprise.description || 'Aucune description fournie.'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Informations</Text>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color="#6B7280"
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Adresse</Text>
                    <Text style={styles.infoValue}>
                      {entreprise.adresse || 'Non renseignée'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color="#6B7280"
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>
                      {entreprise.telephone || 'Non renseigné'}
                    </Text>
                  </View>
                </View>

                {entreprise.email ? (
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="#6B7280"
                      style={styles.infoIcon}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{entreprise.email}</Text>
                    </View>
                  </View>
                ) : null}

                {entreprise.siteWeb ? (
                  <TouchableOpacity
                    style={[styles.infoRow, { borderBottomWidth: 0 }]}
                    onPress={() =>
                      Linking.openURL(`https://${entreprise.siteWeb}`)
                    }
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color="#6B7280"
                      style={styles.infoIcon}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Site web</Text>
                      <Text style={[styles.infoValue, { color: '#2563EB' }]}>
                        {entreprise.siteWeb}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Localisation</Text>

                {/* Carte mémoïsée : ne se re-render jamais à cause
                    d'un changement d'état ailleurs sur l'écran */}
                <CompanyMapPreview
                  latitude={entreprise.latitude}
                  longitude={entreprise.longitude}
                  onPress={openItineraire}
                />

                <View style={styles.locationAddressRow}>
                  <Ionicons name="location" size={16} color="#EF4444" />
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {entreprise.adresse || 'Adresse non renseignée'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ----- En-tête de la section produits + sélecteur de dates -----
                Les lignes de produits elles-mêmes sont gérées par la FlatList
                (data/renderItem) juste en dessous, pour être virtualisées. */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.produitsHeader}>
                  <Text style={styles.cardTitle}>
                    {mots.produitPluriel.charAt(0).toUpperCase() +
                      mots.produitPluriel.slice(1)}
                  </Text>
                  <Text style={styles.produitsCount}>
                    {produits.length} type{produits.length > 1 ? 's' : ''}
                  </Text>
                </View>

                {besoinDuree && (
                  <View style={styles.dateSelectorBox}>
                    <Text style={styles.dateSelectorTitle}>
                      Quand voulez-vous venir ?
                    </Text>

                    <View style={styles.dateSelectorRow}>
                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => setShowPickerDebut(true)}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text
                          style={[
                            styles.dateBtnText,
                            !dateDebut && styles.dateBtnPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {dateDebut ? formatDateFr(dateDebut) : 'Arrivée'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => {
                          if (!dateDebut) {
                            Alert.alert(
                              "Choisissez d'abord la date d'arrivée",
                              'Sélectionnez la date de début avant la date de fin.'
                            );
                            return;
                          }
                          setShowPickerFin(true);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text
                          style={[
                            styles.dateBtnText,
                            !dateFin && styles.dateBtnPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {dateFin ? formatDateFr(dateFin) : 'Départ'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={handleRechercher}
                      >
                        <Ionicons name="search" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {rechercheFaite && (
                      <TouchableOpacity
                        style={styles.clearSearchBtn}
                        onPress={effacerRecherche}
                      >
                        <Ionicons name="close-circle-outline" size={14} color="#6B7280" />
                        <Text style={styles.clearSearchText}>
                          Effacer les dates et voir tout
                        </Text>
                      </TouchableOpacity>
                    )}

                    {showPickerDebut && (
                      <DateTimePicker
                        value={dateDebut || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={onChangeDateDebut}
                      />
                    )}

                    {showPickerFin && (
                      <DateTimePicker
                        value={dateFin || dateDebut || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={dateDebut || new Date()}
                        onChange={onChangeDateFin}
                      />
                    )}
                  </View>
                )}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.produitsStatusBox}>
            {loadingProduits ? (
              <ActivityIndicator size="small" color="#1E3A5F" />
            ) : (
              <Text style={styles.emptyText}>
                Aucun{mots.produit === 'produit' ? '' : 'e'} {mots.produit}{' '}
                disponible
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          <>
            {/* ============================================================
                AVIS (discrets en bas)
                ============================================================ */}
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Avis des clients ({nbAvis})</Text>

                {user && (
                  <View style={styles.avisForm}>
                    <View style={styles.avisStarsInput}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <TouchableOpacity key={s} onPress={() => setNote(s)}>
                          <Ionicons
                            name={s <= note ? 'star' : 'star-outline'}
                            size={26}
                            color={s <= note ? '#f39c12' : '#D1D5DB'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Partagez votre expérience..."
                      placeholderTextColor="#9CA3AF"
                      value={commentaire}
                      onChangeText={setCommentaire}
                      multiline
                      numberOfLines={2}
                    />
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={submitAvis}
                      disabled={submitting}
                    >
                      <Text style={styles.submitButtonText}>
                        {submitting ? 'Envoi...' : 'Envoyer mon avis'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {avisList.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
                ) : (
                  avisList.map((avis) => (
                    <AvisItem key={avis.id_avis} avis={avis} />
                  ))
                )}
              </View>
            </View>

            {entreprise.categorie?.toLowerCase() === 'transport' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.vehiculeButton}
                  onPress={() =>
                    navigation.navigate('CompanyVehicules', {
                      idEntreprise: entreprise.id,
                    })
                  }
                >
                  <Ionicons name="bus-outline" size={22} color="#fff" />
                  <Text style={styles.vehiculeButtonText}>Voir les véhicules</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 30 }} />
          </>
        }
      />

      {/* ============================================================
          MODALE DE DÉTAIL PRODUIT
          ============================================================ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={fermerModale}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {produitSelectionne && (
              <>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={fermerModale}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>

                {produitSelectionne.photos_produit &&
                produitSelectionne.photos_produit.length > 0 ? (
                  <Image
                    source={{ uri: produitSelectionne.photos_produit[0] }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View
                    style={[styles.modalImage, styles.produitThumbPlaceholder]}
                  >
                    <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                  </View>
                )}

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalName}>
                    {produitSelectionne.nom_produit}
                  </Text>
                  <Text style={styles.modalPrice}>
                    {Number(produitSelectionne.prix_produit).toLocaleString(
                      'fr-FR'
                    )}{' '}
                    Ar
                  </Text>

                  <Text style={styles.modalSectionTitle}>DESCRIPTION</Text>
                  <Text style={styles.modalText}>
                    {produitSelectionne.description_pro ||
                      'Aucune description fournie.'}
                  </Text>

                  <View style={styles.modalStock}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.modalStockText}>
                      {produitSelectionne.stock} disponible
                      {produitSelectionne.stock > 1 ? 's' : ''}
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={() => handleActionProduit(produitSelectionne)}
                  >
                    <Text style={styles.modalActionBtnText}>
                      {besoinDuree ? '+ Réserver' : '+ Ajouter au panier'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#DC2626' },

  // ---------- COUVERTURE ----------
  imageContainer: { position: 'relative', height: 240 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ---------- EN-TÊTE ----------
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  nom: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  categorie: { fontSize: 15, color: '#6B7280', marginTop: 2 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starsRow: { flexDirection: 'row', marginRight: 8 },
  ratingText: { fontSize: 13, color: '#6B7280' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, color: '#374151', fontWeight: '500' },

  // ---------- SECTIONS ----------
  section: { paddingHorizontal: 16, paddingTop: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  cardText: { fontSize: 14, lineHeight: 22, color: '#4B5563' },

  // ---------- INFORMATIONS ----------
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  // ---------- PRODUITS ----------
  produitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  produitsCount: { fontSize: 12, color: '#9CA3AF' },

  produitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  produitsStatusBox: {
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  produitThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  produitThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  produitInfo: { flex: 1 },
  produitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  produitDetails: { fontSize: 12, color: '#6B7280' },
  produitPriceBlock: { alignItems: 'flex-end' },
  produitPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  produitPriceSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  // ---------- AVIS ----------
  avisForm: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  avisStarsInput: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  avisItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  avisAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avisAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avisAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  avisNom: { fontSize: 14, fontWeight: '600', color: '#111827' },
  avisStars: { flexDirection: 'row' },
  avisCommentaire: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  avisDate: { fontSize: 11, color: '#9CA3AF' },

  // ---------- TRANSPORT ----------
  vehiculeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  vehiculeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // ---------- MODALE ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  modalImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F3F4F6',
  },
  modalBody: { padding: 20, maxHeight: 280 },
  modalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  modalText: { fontSize: 14, lineHeight: 22, color: '#374151' },
  modalStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  modalStockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalActionBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalActionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ---------- LOCALISATION ----------
  locationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    position: 'relative',
    backgroundColor: '#DBEAFE',
  },
  locationMap: {
    ...StyleSheet.absoluteFillObject,
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationAddressText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  // ---------- SÉLECTEUR DE DATES ----------
dateSelectorBox: {
  backgroundColor: '#F9FAFB',
  borderRadius: 12,
  padding: 12,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
dateSelectorTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: '#374151',
  marginBottom: 8,
},
dateSelectorRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
dateBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 10,
},
dateBtnText: {
  fontSize: 13,
  color: '#111827',
  flex: 1,
},
dateBtnPlaceholder: {
  color: '#9CA3AF',
},
searchBtn: {
  width: 42,
  height: 42,
  borderRadius: 10,
  backgroundColor: '#2563EB',
  justifyContent: 'center',
  alignItems: 'center',
},
clearSearchBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  alignSelf: 'center',
  marginTop: 10,
  paddingVertical: 4,
},
clearSearchText: {
  fontSize: 12,
  color: '#6B7280',
  textDecorationLine: 'underline',
},
produitRowComplet: {
  opacity: 0.6,
},
});