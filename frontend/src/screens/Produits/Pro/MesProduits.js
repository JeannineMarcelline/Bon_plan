import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';
import DateTimePicker from '@react-native-community/datetimepicker';


function estEnPromoActive(produit) {
  if (produit.prix_promo == null) return false;
  if (!produit.date_debut_promo || !produit.date_fin_promo) return false;

  const maintenant = new Date();
  const debut = new Date(produit.date_debut_promo);
  const fin = new Date(produit.date_fin_promo);

  return debut <= maintenant && fin >= maintenant;
}


function calcReduction(prixNormal, prixPromo) {
  if (!prixNormal || !prixPromo) return 0;
  return Math.round((1 - prixPromo / prixNormal) * 100);
}

const ProductCard = memo(function ProductCard({
  item,
  mots,
  onModifier,
  onToggleActif,
  onGererPromo,
}) {
  const estProduit = mots.produit === 'produit';
  const enPromo = estEnPromoActive(item);
  const reduction = enPromo
    ? calcReduction(item.prix_produit, item.prix_promo)
    : 0;

  return (
    <View style={[styles.card, !item.actif && styles.cardInactif]}>
      <View style={styles.cardTop}>
        <Image
          source={{
            uri: item.photos_produit?.[0] || 'https://via.placeholder.com/100',
          }}
          style={styles.photo}
        />

        <View style={styles.infoWrap}>
          {/* Nom + badges */}
          <View style={styles.nomRow}>
            <Text style={styles.nom} numberOfLines={1}>
              {item.nom_produit}
            </Text>
            {enPromo && (
              <View style={styles.badgePromo}>
                <Ionicons name="pricetag" size={10} color="#B45309" />
                <Text style={styles.badgePromoText}>-{reduction}%</Text>
              </View>
            )}
            {!item.actif && (
              <View style={styles.badgeInactif}>
                <Text style={styles.badgeInactifText}>Désactivé</Text>
              </View>
            )}
          </View>

          {/* Prix */}
          {enPromo ? (
            <View style={styles.prixRow}>
              <Text style={styles.prixNormal}>
                {item.prix_produit?.toLocaleString('fr-FR')} Ar
              </Text>
              <Text style={styles.prixPromo}>
                {item.prix_promo?.toLocaleString('fr-FR')} Ar
              </Text>
            </View>
          ) : (
            <Text style={styles.prix}>
              {item.prix_produit?.toLocaleString('fr-FR')} Ar
            </Text>
          )}

          {/* Stock discret */}
          <View style={styles.stockRow}>
            <View
              style={[
                styles.stockDot,
                item.stock === 0 && styles.stockDotZero,
              ]}
            />
            <Text style={styles.stockText}>
              {item.stock > 0
                ? `${item.stock} disponible${item.stock > 1 ? 's' : ''}`
                : 'Rupture de stock'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onModifier(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={15} color="#6B7280" />
          <Text style={styles.actionBtnText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, enPromo && styles.actionBtnActive]}
          onPress={() => onGererPromo(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={enPromo ? 'pricetag' : 'pricetag-outline'}
            size={15}
            color={enPromo ? '#B45309' : '#6B7280'}
          />
          <Text
            style={[
              styles.actionBtnText,
              enPromo && styles.actionBtnTextActive,
            ]}
          >
            {enPromo ? 'Promo active' : 'Promo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onToggleActif(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.actif ? 'eye-off-outline' : 'eye-outline'}
            size={15}
            color="#6B7280"
          />
          <Text style={styles.actionBtnText}>
            {item.actif ? 'Désactiver' : 'Activer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});


export default function MesProduits({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState([]);
  const [mots, setMots] = useState(getConfigCategorie(null).vocabulaire);

const [promoModalVisible, setPromoModalVisible] = useState(false);
const [produitSelectionne, setProduitSelectionne] = useState(null);
const [prixPromo, setPrixPromo] = useState('');
const [dateDebutPromo, setDateDebutPromo] = useState(null);
const [dateFinPromo, setDateFinPromo] = useState(null);
const [showPickerDebut, setShowPickerDebut] = useState(false);
const [showPickerFin, setShowPickerFin] = useState(false);
const [savingPromo, setSavingPromo] = useState(false);
 

  const loadProduits = useCallback(async () => {
    if (!user) return;

    try {
      const { data: entreprise, error: entError } = await supabase
        .from('entreprises')
        .select('id, categories ( nom )')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (entError) throw entError;

      if (!entreprise) {
        setProduits([]);
        return;
      }

      const config = getConfigCategorie(entreprise.categories?.nom || null);
      setMots(config.vocabulaire);

      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('id_entreprise', entreprise.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduits(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProduits();
    }, [loadProduits])
  );

  // ============================================================
  // ACTIONS
  // ============================================================
  const toggleActif = useCallback(async (produit) => {
    const nouvelEtat = !produit.actif;
    const estProduit = mots.produit === 'produit';

    try {
      const { error } = await supabase
        .from('produits')
        .update({ actif: nouvelEtat })
        .eq('id', produit.id);

      if (error) throw error;

      setProduits((prev) =>
        prev.map((p) =>
          p.id === produit.id ? { ...p, actif: nouvelEtat } : p
        )
      );
    } catch (error) {
      console.error('Erreur toggle produit:', error);
      Alert.alert(
        'Erreur',
        `Impossible de modifier ${estProduit ? 'ce produit' : `cette ${mots.produit}`}`
      );
    }
  }, [mots.produit]);

  const confirmerDesactivation = useCallback(
    (produit) => {
      const estProduit = mots.produit === 'produit';
      const label = estProduit ? 'ce produit' : `cette ${mots.produit}`;

      if (produit.actif) {
        Alert.alert(
          `Désactiver ${label}`,
          `"${produit.nom_produit}" ne sera plus visible par les clients. Continuer ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Désactiver',
              style: 'destructive',
              onPress: () => toggleActif(produit),
            },
          ]
        );
      } else {
        toggleActif(produit);
      }
    },
    [mots.produit, toggleActif]
  );

  const handleModifier = useCallback(
    (id) => navigation.navigate('AddProduit', { produitId: id }),
    [navigation]
  );

// OUVERTURE MODALE PROMO
const ouvrirModalePromo = useCallback((produit) => {
  setProduitSelectionne(produit);
  if (produit.prix_promo != null) {
    setPrixPromo(produit.prix_promo.toString());
    setDateDebutPromo(
      produit.date_debut_promo ? new Date(produit.date_debut_promo) : null
    );
    setDateFinPromo(
      produit.date_fin_promo ? new Date(produit.date_fin_promo) : null
    );
  } else {
    setPrixPromo('');
    setDateDebutPromo(null);
    setDateFinPromo(null);
  }
  setPromoModalVisible(true);
}, []);


const fermerModalePromo = useCallback(() => {
  setPromoModalVisible(false);
  setProduitSelectionne(null);
  setPrixPromo('');
  setDateDebutPromo(null);
  setDateFinPromo(null);
}, []);


const sauvegarderPromo = useCallback(async () => {
  if (!produitSelectionne) return;

  if (!prixPromo || !dateDebutPromo || !dateFinPromo) {
    Alert.alert(
      'Promo incomplète',
      'Renseignez le prix promo, la date de début et la date de fin.'
    );
    return;
  }

  if (parseFloat(prixPromo) >= produitSelectionne.prix_produit) {
    Alert.alert(
      'Prix invalide',
      'Le prix promo doit être inférieur au prix normal.'
    );
    return;
  }

  if (dateFinPromo <= dateDebutPromo) {
    Alert.alert(
      'Dates incohérentes',
      'La date de fin doit être après la date de début.'
    );
    return;
  }

  setSavingPromo(true);
  try {
    const { error } = await supabase
      .from('produits')
      .update({
        prix_promo: parseFloat(prixPromo),
        date_debut_promo: dateDebutPromo.toISOString(),
        date_fin_promo: dateFinPromo.toISOString(),
      })
      .eq('id', produitSelectionne.id);

    if (error) throw error;

    fermerModalePromo();
    await loadProduits();
    Alert.alert('Succès', 'Promotion enregistrée.');
  } catch (error) {
    console.error('Erreur sauvegarde promo:', error);
    Alert.alert('Erreur', "Impossible d'enregistrer la promotion.");
  } finally {
    setSavingPromo(false);
  }
}, [produitSelectionne, prixPromo, dateDebutPromo, dateFinPromo, loadProduits, fermerModalePromo]);


const retirerPromo = useCallback(async () => {
  if (!produitSelectionne) return;

  Alert.alert(
    'Retirer la promotion',
    `Retirer la promo de "${produitSelectionne.nom_produit}" ?`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          setSavingPromo(true);
          try {
            const { error } = await supabase
              .from('produits')
              .update({
                prix_promo: null,
                date_debut_promo: null,
                date_fin_promo: null,
              })
              .eq('id', produitSelectionne.id);

            if (error) throw error;

            fermerModalePromo();
            await loadProduits();
          } catch (error) {
            console.error('Erreur retrait promo:', error);
            Alert.alert('Erreur', 'Impossible de retirer la promotion.');
          } finally {
            setSavingPromo(false);
          }
        },
      },
    ]
  );
}, [produitSelectionne, loadProduits, fermerModalePromo]);

  const renderItem = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        mots={mots}
        onModifier={handleModifier}
        onToggleActif={confirmerDesactivation}
        onGererPromo={ouvrirModalePromo}
      />
    ),
    [mots, handleModifier, confirmerDesactivation, ouvrirModalePromo]
  );

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // ============================================================
  // ÉCRANS DE CHARGEMENT / VIDE
  // ============================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const estProduit = mots.produit === 'produit';
  const produitLabel = estProduit ? 'un' : 'une';
  const produitLabelArticle = estProduit ? 'un autre' : 'une autre';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes {mots.produitPluriel}</Text>
      </View>

      {produits.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            Aucun{estProduit ? '' : 'e'} {mots.produit} pour l'instant
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduit')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>
              Ajouter {produitLabel} {mots.produit}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={produits}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          // Optimisations de la liste
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButtonFooter}
              onPress={() => navigation.navigate('AddProduit')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addButtonFooterText}>
                Ajouter {produitLabelArticle} {mots.produit}
              </Text>
            </TouchableOpacity>
          }
               />
      )}

      {/* ⭐ MODALE PROMO */}
      <Modal
        visible={promoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={fermerModalePromo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Promotion</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={fermerModalePromo}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {produitSelectionne && (
                <>
                  <Text style={styles.modalProduitNom}>
                    {produitSelectionne.nom_produit}
                  </Text>
                  <Text style={styles.modalProduitPrix}>
                    Prix normal : {produitSelectionne.prix_produit?.toLocaleString('fr-FR')} Ar
                  </Text>

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Prix promo (Ar) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ex: 75000"
                      keyboardType="numeric"
                      value={prixPromo}
                      onChangeText={setPrixPromo}
                    />
                    {prixPromo && parseFloat(prixPromo) < produitSelectionne.prix_produit && (
                      <View style={styles.reductionHint}>
                        <Ionicons name="pricetag" size={12} color="#B45309" />
                        <Text style={styles.reductionHintText}>
                          Réduction : -
                          {calcReduction(produitSelectionne.prix_produit, parseFloat(prixPromo))}%
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalRow}>
                    <View style={styles.modalHalf}>
                      <Text style={styles.modalLabel}>Du *</Text>
                      <TouchableOpacity
                        style={styles.modalDateBtn}
                        onPress={() => setShowPickerDebut(true)}
                      >
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text
                          style={[
                            styles.modalDateText,
                            !dateDebutPromo && styles.modalDatePlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {dateDebutPromo
                            ? dateDebutPromo.toLocaleDateString('fr-FR')
                            : 'Choisir'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalHalf}>
                      <Text style={styles.modalLabel}>Au *</Text>
                      <TouchableOpacity
                        style={styles.modalDateBtn}
                        onPress={() => setShowPickerFin(true)}
                      >
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text
                          style={[
                            styles.modalDateText,
                            !dateFinPromo && styles.modalDatePlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {dateFinPromo
                            ? dateFinPromo.toLocaleDateString('fr-FR')
                            : 'Choisir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showPickerDebut && (
                    <DateTimePicker
                      value={dateDebutPromo || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') setShowPickerDebut(false);
                        if (event.type === 'dismissed') return;
                        if (selectedDate) setDateDebutPromo(selectedDate);
                      }}
                    />
                  )}

                  {showPickerFin && (
                    <DateTimePicker
                      value={dateFinPromo || dateDebutPromo || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={dateDebutPromo || new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') setShowPickerFin(false);
                        if (event.type === 'dismissed') return;
                        if (selectedDate) setDateFinPromo(selectedDate);
                      }}
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, savingPromo && { opacity: 0.6 }]}
                    onPress={sauvegarderPromo}
                    disabled={savingPromo}
                  >
                    {savingPromo ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalSaveBtnText}>
                        Enregistrer la promo
                      </Text>
                    )}
                  </TouchableOpacity>

                  {produitSelectionne.prix_promo != null && (
                    <TouchableOpacity
                      style={styles.modalRemoveBtn}
                      onPress={retirerPromo}
                      disabled={savingPromo}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.modalRemoveBtnText}>
                        Retirer la promo
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 12 },

  listContent: { padding: 16, paddingBottom: 40 },

  // ⭐ CARTE REDESIGNÉE
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInactif: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', gap: 12 },
  photo: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6' },
  infoWrap: { flex: 1, justifyContent: 'center' },
  nomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  nom: { fontSize: 15, fontWeight: '600', color: '#111827', flexShrink: 1 },

  // ⭐ Badges
  badgePromo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePromoText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  badgeInactif: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeInactifText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },

  // ⭐ Prix
  prixRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  prixNormal: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  prixPromo: { fontSize: 15, fontWeight: '800', color: '#B45309' },
  prix: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 3 },

  // ⭐ Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  stockDotZero: { backgroundColor: '#EF4444' },
  stockText: { fontSize: 11, color: '#6B7280' },

  // ⭐ Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionBtnActive: { backgroundColor: '#FEF3C7' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  actionBtnTextActive: { color: '#B45309' },

  // Vide / Ajouter
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 10, marginBottom: 16 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  addButtonFooterText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },

  // ⭐ MODALE PROMO
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProduitNom: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalProduitPrix: { fontSize: 13, color: '#6B7280', marginBottom: 16 },

  modalField: { marginBottom: 14 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  reductionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reductionHintText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  modalRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  modalHalf: { flex: 1 },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  modalDateText: { fontSize: 13, color: '#111827', flex: 1 },
  modalDatePlaceholder: { color: '#9CA3AF' },

  modalSaveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 6,
  },
  modalRemoveBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
});