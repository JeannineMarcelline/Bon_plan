import React, { useState, useEffect } from 'react';
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

  // Modale de détail produit
  const [produitSelectionne, setProduitSelectionne] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { addToCart } = useCart();

  const config = getConfigCategorie(entreprise?.categorie || null);
  const mots = config.vocabulaire;
  const besoinDuree = config.besoinDuree;

  // ============================================================
  // CHARGEMENT PRODUITS
  // ============================================================
  const loadProduits = async (entrepriseId) => {
    try {
      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('actif', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduits(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoadingProduits(false);
    }
  };

  // ============================================================
  // CHARGEMENT AVIS
  // ============================================================
  const loadAvis = async (entrepriseId) => {
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
  };

  // ============================================================
  // SOUMETTRE UN AVIS
  // ============================================================
  const submitAvis = async () => {
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
  };

  // ============================================================
  // PARTAGER WHATSAPP
  // ============================================================
  const shareWhatsApp = () => {
    const message = `🏢 *${entreprise.nom}*\nAdresse : ${entreprise.adresse}\nTéléphone : ${entreprise.telephone}\nNote : ${noteMoyenne.toFixed(1)}/5\n\n`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', "WhatsApp n'est pas installé");
    });
  };

  // ============================================================
  // ITINÉRAIRE
  // ============================================================
  const openItineraire = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.latitude || ''},${userLocation?.longitude || ''}&destination=${entreprise.latitude || -21.4526},${entreprise.longitude || 47.0855}`;
    Linking.openURL(url);
  };

  // ============================================================
  // MODALE PRODUIT
  // ============================================================
  const ouvrirModale = (produit) => {
    setProduitSelectionne(produit);
    setModalVisible(true);
  };

  const fermerModale = () => {
    setModalVisible(false);
    setProduitSelectionne(null);
  };

  const handleActionProduit = (produit) => {
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
      });
    } else {
      addToCart(produit);
      fermerModale();
      Alert.alert(
        '🛒 Ajouté',
        `${produit.nom_produit} a été ajouté à votre ${mots.panier}`
      );
    }
  };

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
          await loadAvis(e.id);
          await loadProduits(e.id);
        }
      } catch (error) {
        console.error('Erreur chargement entreprise:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // ============================================================
  // ÉTOILES
  // ============================================================
  const renderStars = (n, size = 16) => {
    let stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={
            i < Math.floor(n) ? 'star' : i < n ? 'star-half' : 'star-outline'
          }
          size={size}
          color="#f39c12"
        />
      );
    }
    return stars;
  };

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ============================================================
            IMAGE DE COUVERTURE
            ============================================================ */}
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

        {/* ============================================================
            EN-TÊTE : Nom + catégorie + note
            ============================================================ */}
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

        {/* ============================================================
            DESCRIPTION
            ============================================================ */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.cardText}>
              {entreprise.description || 'Aucune description fournie.'}
            </Text>
          </View>
        </View>

        {/* ============================================================
            INFORMATIONS (avec icônes + label + valeur)
            ============================================================ */}
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
        {/* ============================================================
            LOCALISATION (vignette cliquable)
            ============================================================ */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Localisation</Text>

            {/* Vignette de carte cliquable */}
            <TouchableOpacity
              style={styles.locationCard}
              onPress={openItineraire}
              activeOpacity={0.85}
            >
              <MapView
                style={styles.locationMap}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                pointerEvents="none"
                region={{
                  latitude: entreprise.latitude || -21.4526,
                  longitude: entreprise.longitude || 47.0855,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
              >
                {entreprise.latitude && entreprise.longitude && (
                  <Marker
                    coordinate={{
                      latitude: entreprise.latitude,
                      longitude: entreprise.longitude,
                    }}
                  />
                )}
              </MapView>

              {/* Overlay "Voir sur la carte" */}
              <View style={styles.locationOverlay}>
                <Ionicons name="navigate" size={14} color="#fff" />
                <Text style={styles.locationOverlayText}>
                  Voir sur la carte
                </Text>
              </View>
            </TouchableOpacity>

            {/* Adresse en dessous */}
            <View style={styles.locationAddressRow}>
              <Ionicons name="location" size={16} color="#EF4444" />
              <Text style={styles.locationAddressText} numberOfLines={2}>
                {entreprise.adresse || 'Adresse non renseignée'}
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            CHAMBRES / PRODUITS
            Liste verticale avec photo à gauche (comme le modèle)
            ============================================================ */}
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

            {loadingProduits ? (
              <ActivityIndicator size="small" color="#1E3A5F" />
            ) : produits.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucun{mots.produit === 'produit' ? '' : 'e'} {mots.produit}{' '}
                disponible
              </Text>
            ) : (
              produits.map((produit, index) => (
                <TouchableOpacity
                  key={produit.id}
                  style={[
                    styles.produitRow,
                    index === produits.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => ouvrirModale(produit)}
                  activeOpacity={0.7}
                >
                  {/* Image à gauche */}
                  {produit.photos_produit &&
                  produit.photos_produit.length > 0 ? (
                    <Image
                      source={{ uri: produit.photos_produit[0] }}
                      style={styles.produitThumb}
                    />
                  ) : (
                    <View
                      style={[
                        styles.produitThumb,
                        styles.produitThumbPlaceholder,
                      ]}
                    >
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}

                  {/* Infos à droite */}
                  <View style={styles.produitInfo}>
                    <Text style={styles.produitName} numberOfLines={1}>
                      {produit.nom_produit}
                    </Text>
                    <Text style={styles.produitDetails} numberOfLines={1}>
                      {produit.description_pro || `${mots.produit} disponible`}
                    </Text>
                  </View>

                  {/* Prix à droite */}
                  <View style={styles.produitPriceBlock}>
                    <Text style={styles.produitPrice}>
                      {Number(produit.prix_produit).toLocaleString('fr-FR')} Ar
                    </Text>
                    <Text style={styles.produitPriceSub}>par unité</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* ============================================================
            AVIS (discrets en bas)
            ============================================================ */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Avis des clients ({nbAvis})</Text>

            {/* Formulaire compact */}
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

            {/* Liste des avis */}
            {avisList.length === 0 ? (
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            ) : (
              avisList.map((avis) => (
                <View key={avis.id_avis} style={styles.avisItem}>
                  <View style={styles.avisHeader}>
                    <View style={styles.avisAuthorRow}>
                      <View style={styles.avisAvatar}>
                        <Text style={styles.avisAvatarText}>
                          {avis.nom_utilisateur?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <Text style={styles.avisNom}>{avis.nom_utilisateur}</Text>
                    </View>
                    <View style={styles.avisStars}>
                      {renderStars(avis.note, 12)}
                    </View>
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
              ))
            )}
          </View>
        </View>

        {/* ============================================================
            SECTION TRANSPORT (spécifique)
            ============================================================ */}
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
      </ScrollView>

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

                {/* Image */}
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

  produitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
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
});