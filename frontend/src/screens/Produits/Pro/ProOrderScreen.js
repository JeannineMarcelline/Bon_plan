import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';

// Ordre d'affichage des filtres
const FILTRES_ORDER = [
  'toutes',
  'en_attente',
  'confirmée',
  'expédiée',
  'livrée',
  'annulée',
];

export default function ProOrderScreen({ navigation }) {
  const { user } = useAuth();
  const [commande, setCommande] = useState([]);
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categorieEntreprise, setCategorieEntreprise] = useState(null);
  const [filtreActif, setFiltreActif] = useState('toutes');

  const config = getConfigCategorie(categorieEntreprise);
  const mots = config.vocabulaire;

  // ---------- Statuts ----------
  const STATUTS = {
    en_attente: {
      label: 'En attente',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: 'time-outline',
    },
    confirmée: {
      label: 'Confirmée',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: 'checkmark-circle-outline',
    },
    expédiée: {
      label: 'Expédiée',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      icon: 'rocket-outline',
    },
    livrée: {
      label: 'Livrée',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'checkmark-done-circle-outline',
    },
    annulée: {
      label: 'Annulée',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: 'close-circle-outline',
    },
  };

  // ---------- Chargement entreprise ----------
  const loadEntreprise = async () => {
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('id, nom, categories (nom)')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setEntreprise(data);
      setCategorieEntreprise(data?.categories?.nom || null);
      return data;
    } catch (error) {
      console.error('Erreur de chargement de entreprise', error);
      return null;
    }
  };

  // ---------- Chargement commandes ----------
  // `silent = true` : pas de spinner plein écran (utilisé pour le refresh focus)
  const loadCommande = async (silent = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const entrepriseData = await loadEntreprise();

      if (!entrepriseData) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('commande')
        .select(`
          id_commande,
          reference,
          statut,
          prix_total,
          date_commande,
          adresse_livraison,
          telephone_livraison,
          notes,
          utilisateurs:utilisateurs!commande_id_client_fkey (
            nom,
            email,
            telephone
          ),
          ligne_commande (
            quantite,
            prix_unitaire,
            produits (
              nom_produit,
              photos_produit
            )
          )
        `)
        .eq('id_entreprise', entrepriseData.id)
        .order('date_commande', { ascending: false });

      if (error) throw error;

      setCommande(data || []);
    } catch (error) {
      console.error('Erreur de chargement de commande', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Rafraîchit quand l'écran reprend le focus (ex : retour depuis ProOrderDetail)
  useFocusEffect(
    useCallback(() => {
      // silent = true uniquement si on a déjà des données (évite le flash de spinner)
      loadCommande(commande.length > 0);
    }, [user?.id])
  );

  // Pull-to-refresh manuel
  const onRefresh = () => {
    setRefreshing(true);
    loadCommande(true);
  };

  // ---------- Rendu statut ----------
  const renderStatut = (statut) => {
    const cfg = STATUTS[statut] || STATUTS.en_attente;
    return (
      <View style={[styles.statutBadge, { backgroundColor: cfg.bgColor }]}>
        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
        <Text style={[styles.statutText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  };

  // ---------- Compteurs par statut ----------
  const compteurs = commande.reduce(
    (acc, c) => {
      acc.toutes = (acc.toutes || 0) + 1;
      acc[c.statut] = (acc[c.statut] || 0) + 1;
      return acc;
    },
    { toutes: 0 }
  );

  const commandesFiltrees =
    filtreActif === 'toutes'
      ? commande
      : commande.filter((c) => c.statut === filtreActif);

  // ---------- Rendu d'une carte ----------
  const renderItem = ({ item }) => {
    const totalItems =
      item.ligne_commande?.reduce((sum, l) => sum + l.quantite, 0) || 0;

    const client = item.utilisateurs || {};
    const date = new Date(item.date_commande);
    const dateFormatee = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ProOrderDetail', { commandeId: item.id_commande })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.reference}>#{item.reference}</Text>
          {renderStatut(item.statut)}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.clientName}>👤 {client.nom || 'Client inconnu'}</Text>
          <View style={styles.cardDetails}>
            <Text style={styles.totalItems}>
              {totalItems} {totalItems > 1 ? mots.produitPluriel : mots.produit}
            </Text>
            <Text style={styles.totalPrice}>
              {item.prix_total?.toLocaleString('fr-FR') || 0} Ar
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{dateFormatee}</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- Écrans intermédiaires ----------
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="business-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune entreprise trouvée</Text>
        <Text style={styles.emptySub}>
          Vous devez créer votre entreprise pour voir les commandes.
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('AddCompany')}
        >
          <Text style={styles.createButtonText}>➕ Créer mon entreprise</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const nbEnAttente = compteurs.en_attente || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            📋 {mots.commandePluriel.charAt(0).toUpperCase() + mots.commandePluriel.slice(1)} reçues
          </Text>
          <Text style={styles.subtitle}>{entreprise.nom}</Text>
          {nbEnAttente > 0 && (
            <View style={styles.attenteBadge}>
              <Ionicons name="time-outline" size={12} color="#D97706" />
              <Text style={styles.attenteBadgeText}>
                {nbEnAttente} en attente
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Filtres par statut */}
      <View style={styles.filtresWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtresContent}
        >
          {FILTRES_ORDER.map((key) => {
            const isToutes = key === 'toutes';
            const cfg = isToutes ? null : STATUTS[key];
            const label = isToutes ? 'Toutes' : cfg?.label || key;
            const count = compteurs[key] || 0;
            const selected = filtreActif === key;

            // On cache les puces des statuts à 0 (sauf "toutes" et "en_attente")
            if (!isToutes && count === 0 && key !== 'en_attente') return null;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filtrePuce,
                  selected && styles.filtrePuceActive,
                  selected &&
                    !isToutes && { borderColor: cfg.color, backgroundColor: cfg.bgColor },
                ]}
                onPress={() => setFiltreActif(key)}
              >
                {!isToutes && cfg && (
                  <Ionicons
                    name={cfg.icon}
                    size={13}
                    color={selected ? cfg.color : '#6B7280'}
                  />
                )}
                <Text
                  style={[
                    styles.filtrePuceText,
                    selected && !isToutes && { color: cfg.color, fontWeight: '700' },
                    selected && isToutes && { color: '#2563EB', fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.filtreCompteur,
                    selected && !isToutes && { backgroundColor: cfg.color + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.filtreCompteurText,
                      selected && !isToutes && { color: cfg.color },
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

      {/* Liste filtrée */}
      {commandesFiltrees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {filtreActif === 'toutes'
              ? `📦 Aucune ${mots.commande} reçue`
              : `Aucune ${mots.commande} "${STATUTS[filtreActif]?.label || ''}"`}
          </Text>
          <Text style={styles.emptySub}>
            {filtreActif === 'toutes'
              ? `Vous n'avez pas encore reçu de ${mots.commandePluriel} pour ${entreprise.nom}.`
              : 'Essayez un autre filtre ou revenez plus tard.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={commandesFiltrees}
          keyExtractor={(item) => item.id_commande.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4 },
  headerContent: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  attenteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  attenteBadgeText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  refreshButton: { padding: 8 },

  // Filtres
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
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filtrePuceText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filtreCompteur: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtreCompteurText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  // Liste
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reference: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statutText: { fontSize: 12, fontWeight: '600' },
  cardBody: { marginBottom: 8 },
  clientName: { fontSize: 15, fontWeight: '500', color: '#374151' },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalItems: { fontSize: 13, color: '#6B7280' },
  totalPrice: { fontSize: 17, fontWeight: 'bold', color: '#2563EB' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  date: { fontSize: 12, color: '#9CA3AF' },

  // Vide
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});