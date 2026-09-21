import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { supabase } from '../lib/supabase';
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from '@react-native-community/netinfo';
import { initOfflineCache, setCacheReservations, getCacheReservations } from '../database/Offlinecache';
import { getConfigCategorie } from '../Config/categorieConfig';

export default function MesReservationScreen({ navigation }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [filtreActif, setFiltreActif] = useState('toutes');

  // ============================================================
  // OFFLINE
  // ============================================================
  useEffect(() => {
    initOfflineCache();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // ============================================================
  // CHARGEMENT DES RÉSERVATIONS (transport + hôtel/cyber/location)
  // ============================================================
  const loadReservation = async () => {
    try {
      const netState = await NetInfo.fetch();

      // Hors-ligne : on lit le cache local
      if (!netState.isConnected) {
        const cached = await getCacheReservations();
        setReservations(cached);
        setLoading(false);
        return;
      }

      // --- 1. Charger les réservations TRANSPORT ---
      const { data: transportData, error: transportError } = await supabase
        .from('reservation_transport')
        .select(`
          id_reservation,
          date_reservation,
          statut,
          prix_total,
          paye,
          vehicules (
            nom,
            photo,
            ville_depart,
            ville_arrivee,
            date_depart,
            heure_depart,
            entreprises ( nom )
          ),
          reservation_places (
            id_place,
            places ( numero_place, position )
          )
        `)
        .eq('id_utilisateur', user.id)
        .order('date_reservation', { ascending: false });

      if (transportError) throw transportError;

      const transportsFormates = (transportData || []).map((r) => {
        const numeros = (r.reservation_places || [])
          .map((rp) => rp.places?.numero_place)
          .filter(Boolean);
        return {
          // Identifiant unique commun
          id_unique: `transport-${r.id_reservation}`,
          id_reservation: r.id_reservation,
          type: 'transport',           // sert au filtre
          categorie: 'Transport',
          date_ref: r.date_reservation,
          statut: r.statut,
          prix_total: r.prix_total,
          paye: r.paye,

          // Infos d'affichage transport
          vehicule_nom: r.vehicules?.nom,
          vehicule_photo: r.vehicules?.photo,
          entreprise_nom: r.vehicules?.entreprises?.nom,
          ville_depart: r.vehicules?.ville_depart,
          ville_arrivee: r.vehicules?.ville_arrivee,
          date_depart: r.vehicules?.date_depart,
          heure_depart: r.vehicules?.heure_depart,
          places: numeros.join(', '),
          nb_places: numeros.length,
        };
      });

     
      const { data: cmdData, error: cmdError } = await supabase
        .from('commande')
        .select(`
          id_commande,
          reference,
          statut,
          prix_total,
          date_commande,
          date_debut,
          date_fin,
          entreprises (
            nom,
            logo,
            categories ( nom )
          ),
          ligne_commande (
            quantite,
            prix_unitaire,
            produits ( nom_produit, photos_produit )
          )
        `)
        .eq('id_client', user.id)
        .not('date_debut', 'is', null)
        .order('date_commande', { ascending: false });

      if (cmdError) throw cmdError;

      const commandesFormates = (cmdData || []).map((c) => {
        const categorieNom = c.entreprises?.categories?.nom || null;
        const config = getConfigCategorie(categorieNom);
        const totalItems = (c.ligne_commande || []).reduce(
          (sum, l) => sum + (l.quantite || 0),
          0
        );

        return {
          id_unique: `commande-${c.id_commande}`,
          id_commande: c.id_commande,
          type: 'commande',
          categorie: categorieNom || 'Réservation',
          categorie_key: categorieNom,
          date_ref: c.date_commande,
          statut: c.statut,
          prix_total: c.prix_total,

          // Infos d'affichage
          entreprise_nom: c.entreprises?.nom,
          entreprise_logo: c.entreprises?.logo,
          reference: c.reference,
          date_debut: c.date_debut,
          date_fin: c.date_fin,
          total_items: totalItems,

          // Vocabulaire adapté
          mots: config.vocabulaire,
        };
      });

      // --- 3. Fusion + tri par date décroissante ---
      const toutes = [...transportsFormates, ...commandesFormates].sort(
        (a, b) => new Date(b.date_ref) - new Date(a.date_ref)
      );

      setReservations(toutes);
      await setCacheReservations(toutes);
    } catch (error) {
      console.error('Erreur de chargement de réservations', error);
      const cached = await getCacheReservations();
      setReservations(cached);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReservation();
    }, [])
  );

  // ============================================================
  // ANNULATION TRANSPORT (inchangé)
  // ============================================================
  const annulerReservationTransport = async (idReservation) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: placesData, error: placesError } = await supabase
                .from('reservation_places')
                .select('id_place')
                .eq('id_reservation', idReservation);

              if (placesError) throw placesError;

              const { error: reservationError } = await supabase
                .from('reservation_transport')
                .update({ statut: 'annulee' })
                .eq('id_reservation', idReservation);

              if (reservationError) throw reservationError;

              if (placesData && placesData.length > 0) {
                for (const item of placesData) {
                  await supabase
                    .from('places')
                    .update({ statut: 'disponible' })
                    .eq('id_place', item.id_place);
                }
              }

              Alert.alert('Annulation réussie', 'Votre réservation a été annulée.');
              loadReservation();
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // PAIEMENT TRANSPORT (inchangé)
  // ============================================================
  const handlePayerTransport = async (idReservation) => {
    if (!isOnline) {
      Alert.alert(
        'Connexion requise',
        'Le paiement nécessite une connexion internet.'
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('reservation_transport')
        .update({ paye: true })
        .eq('id_reservation', idReservation);

      if (error) throw error;

      Alert.alert('Paiement effectué', 'Votre paiement a bien été enregistré.');
      loadReservation();
    } catch (error) {
      console.error('Erreur paiement:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer le paiement");
    }
  };

  // ============================================================
  // HELPERS STATUT
  // ============================================================
  const getStatutConfig = (statut) => {
    // On gère les deux systèmes de statuts (avec ou sans accent)
    const s = statut?.toLowerCase();
    if (s === 'confirmee' || s === 'confirmée') {
      return { label: 'Confirmée', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' };
    }
    if (s === 'annulee' || s === 'annulée') {
      return { label: 'Annulée', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
    }
    if (s === 'expediee' || s === 'expédiée') {
      return { label: 'Expédiée', color: '#8B5CF6', bg: '#EDE9FE', icon: 'rocket' };
    }
    if (s === 'livree' || s === 'livrée') {
      return { label: 'Livrée', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-done-circle' };
    }
    return { label: 'En attente', color: '#D97706', bg: '#FEF3C7', icon: 'time' };
  };

  // ============================================================
  // FILTRE
  // ============================================================
  // Liste des catégories distinctes présentes dans les réservations
  const categoriesDisponibles = Array.from(
    new Set(reservations.map((r) => r.categorie))
  );

  // On n'affiche la barre de filtres que s'il y a au moins 2 catégories
  const afficherFiltres = categoriesDisponibles.length >= 2;

  // Réservations filtrées
  const reservationsFiltrees =
    filtreActif === 'toutes'
      ? reservations
      : reservations.filter((r) => r.categorie === filtreActif);

  // ============================================================
  // RENDU D'UNE CARTE
  // ============================================================
  const renderCardTransport = (item) => {
  const statutConfig = getStatutConfig(item.statut);

  // La carte n'est cliquable QUE si la réservation est payée.
  // Sinon, elle reste une View normale (pas de navigation).
  const estPaye = item.paye === true;
  const estAnnulee = item.statut === 'annulee' || item.statut === 'annulée';
  const estCliquable = estPaye && !estAnnulee;

  const CardWrapper = estCliquable ? TouchableOpacity : View;
  const wrapperProps = estCliquable
    ? {
        onPress: () =>
          navigation.navigate('TicketScreen', {
            idReservation: item.id_reservation,
          }),
        activeOpacity: 0.7,
      }
    : {};

  return (
    <CardWrapper style={styles.card} {...wrapperProps}>
      <View style={styles.cardHeader}>
        {item.vehicule_photo ? (
          <Image source={{ uri: item.vehicule_photo }} style={styles.vehicleImage} />
        ) : (
          <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
            <Ionicons name="car-outline" size={26} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.vehiculeNom} numberOfLines={1}>
            {item.vehicule_nom}
          </Text>
          {item.entreprise_nom && (
            <Text style={styles.entrepriseNom} numberOfLines={1}>
              {item.entreprise_nom}
            </Text>
          )}
          <View style={[styles.statutBadge, { backgroundColor: statutConfig.bg }]}>
            <Ionicons name={statutConfig.icon} size={12} color={statutConfig.color} />
            <Text style={[styles.statutText, { color: statutConfig.color }]}>
              {statutConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.ville_depart} → {item.ville_arrivee}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.date_depart} à {item.heure_depart}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="grid-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.nb_places} place(s) — n° {item.places}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>{item.prix_total} Ar</Text>
        </View>

        {item.statut === 'confirmee' && !item.paye && (
          <TouchableOpacity
            style={[styles.payerButton, !isOnline && styles.payerButtonDisabled]}
            onPress={() => handlePayerTransport(item.id_reservation)}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.payerButtonText}>
              {isOnline ? 'Payer' : 'Hors-ligne'}
            </Text>
          </TouchableOpacity>
        )}

        {item.statut === 'confirmee' && item.paye && (
          <TouchableOpacity
            style={styles.payeBadge}
            onPress={() =>
              navigation.navigate('TicketScreen', {
                idReservation: item.id_reservation,
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="ticket-outline" size={16} color="#16A34A" />
            <Text style={styles.payeBadgeText}>Billet</Text>
            <Ionicons name="chevron-forward" size={14} color="#16A34A" />
          </TouchableOpacity>
        )}

        {item.statut !== 'annulee' && item.statut !== 'terminee' && (
          <TouchableOpacity
            style={styles.annulerButton}
            onPress={() => annulerReservationTransport(item.id_reservation)}
          >
            <Text style={styles.annulerButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Petite flèche en bas à droite, uniquement si la carte est cliquable
          (payée et non annulée) — cohérent avec les cartes hôtel. */}
      {estCliquable && (
        <View style={styles.chevronIndicator}>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      )}
    </CardWrapper>
  );
};

  const renderCardCommande = (item) => {
    const statutConfig = getStatutConfig(item.statut);
    const mots = item.mots || {};
    const produitLabel = mots.produit || 'article';
    const produitPluriel = mots.produitPluriel || 'articles';
    const commandeLabel =
      (mots.commande?.charAt(0).toUpperCase() + mots.commande?.slice(1)) ||
      'Réservation';
    const totalItems = item.total_items || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ClientOrderDetail', {
            commandeId: item.id_commande,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {item.entreprise_logo ? (
            <Image
              source={{ uri: item.entreprise_logo }}
              style={styles.vehicleImage}
            />
          ) : (
            <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
              <Ionicons name="business-outline" size={26} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.vehiculeNom} numberOfLines={1}>
              {item.entreprise_nom || 'Entreprise'}
            </Text>
            <Text style={styles.entrepriseNom} numberOfLines={1}>
              {commandeLabel} #{item.reference}
            </Text>
            <View style={[styles.statutBadge, { backgroundColor: statutConfig.bg }]}>
              <Ionicons name={statutConfig.icon} size={12} color={statutConfig.color} />
              <Text style={[styles.statutText, { color: statutConfig.color }]}>
                {statutConfig.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {totalItems} {totalItems > 1 ? produitPluriel : produitLabel}
            </Text>
          </View>
          {item.date_debut && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>
                Du {new Date(item.date_debut).toLocaleDateString('fr-FR')}
                {item.date_fin
                  ? ` au ${new Date(item.date_fin).toLocaleDateString('fr-FR')}`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.priceValue}>
            {item.prix_total?.toLocaleString('fr-FR') || 0} Ar
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) =>
    item.type === 'transport' ? renderCardTransport(item) : renderCardCommande(item);

  // ============================================================
  // ÉCRAN PRINCIPAL
  // ============================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes réservations</Text>
      </View>

      {/* Barre de filtres (cachée s'il n'y a qu'une seule catégorie) */}
      {afficherFiltres && (
        <View style={styles.filtresWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtresContent}
          >
            {/* Puce "Toutes" */}
            <TouchableOpacity
              style={[
                styles.filtrePuce,
                filtreActif === 'toutes' && styles.filtrePuceActive,
              ]}
              onPress={() => setFiltreActif('toutes')}
            >
              <Text
                style={[
                  styles.filtrePuceText,
                  filtreActif === 'toutes' && styles.filtrePuceTextActive,
                ]}
              >
                Toutes
              </Text>
              <View
                style={[
                  styles.filtreCompteur,
                  filtreActif === 'toutes' && styles.filtreCompteurActive,
                ]}
              >
                <Text
                  style={[
                    styles.filtreCompteurText,
                    filtreActif === 'toutes' && styles.filtreCompteurTextActive,
                  ]}
                >
                  {reservations.length}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Une puce par catégorie présente */}
            {categoriesDisponibles.map((cat) => {
              const count = reservations.filter((r) => r.categorie === cat).length;
              const selected = filtreActif === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filtrePuce, selected && styles.filtrePuceActive]}
                  onPress={() => setFiltreActif(cat)}
                >
                  <Text
                    style={[
                      styles.filtrePuceText,
                      selected && styles.filtrePuceTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                  <View
                    style={[
                      styles.filtreCompteur,
                      selected && styles.filtreCompteurActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filtreCompteurText,
                        selected && styles.filtreCompteurTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {reservationsFiltrees.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {filtreActif === 'toutes'
              ? 'Aucune réservation'
              : `Aucune réservation "${filtreActif}"`}
          </Text>
          <Text style={styles.emptySubtext}>
            {filtreActif === 'toutes'
              ? 'Vos réservations apparaîtront ici.'
              : 'Essayez un autre filtre.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservationsFiltrees}
          keyExtractor={(item) => item.id_unique}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  // Barre de filtres
  filtresWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtresContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filtrePuce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  filtrePuceActive: {
    borderColor: '#1E3A5F',
    backgroundColor: '#EFF6FF',
  },
  filtrePuceText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filtrePuceTextActive: { color: '#1E3A5F', fontWeight: '700' },
  filtreCompteur: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtreCompteurActive: { backgroundColor: '#1E3A5F22' },
  filtreCompteurText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  filtreCompteurTextActive: { color: '#1E3A5F' },

  list: { padding: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vehicleImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  vehicleImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1, marginLeft: 12 },
  vehiculeNom: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  entrepriseNom: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    marginTop: -4,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statutText: { fontSize: 12, fontWeight: '700' },

  detailsSection: { marginBottom: 14, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flexShrink: 1 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  priceValue: { fontSize: 19, fontWeight: '800', color: '#1E3A5F' },

  payerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  payerButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  payerButtonDisabled: { backgroundColor: '#9CA3AF' },

  payeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  payeBadgeText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },
  annulerButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  annulerButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 13,
  },
  chevronIndicator: {
  position: 'absolute',
  bottom: 12,
  right: 12,
},
});