import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';

export default function ClientOrderScreen({ navigation }) {
  const { user } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // CHARGEMENT DES COMMANDES
  // On exclut les réservations (celles qui ont date_debut rempli).
  // ============================================================
  const loadCommande = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('commande')
        .select(`
          *,
          entreprises ( nom, logo, categories ( nom ) ),
          ligne_commande (
            quantite,
            prix_unitaire,
            total_ligne,
            produits ( nom_produit, photos_produit )
          )
        `)
        .eq('id_client', user.id)
        .is('date_debut', null)   // ← EXCLUT les réservations
        .order('date_commande', { ascending: false });

      if (error) throw error;

      setCommandes(data || []);
    } catch (error) {
      console.error('Erreur de chargement de commande', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCommande();
    }, [user?.id])
  );

  // ============================================================
  // STATUTS
  // ============================================================
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

  const renderStatut = (statut) => {
    const config = STATUTS[statut] || STATUTS.en_attente;
    return (
      <View style={[styles.statutBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.statutText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  // ============================================================
  // RENDU D'UNE COMMANDE
  // ============================================================
  const renderItem = ({ item }) => {
    const totalItems =
      item.ligne_commande?.reduce((sum, ligne) => sum + ligne.quantite, 0) || 0;

    const date = new Date(item.date_commande);
    const dateFormatee = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Vocabulaire adapté selon la catégorie de l'entreprise
    const nomCategorie = item.entreprises?.categories?.nom || null;
    const config = getConfigCategorie(nomCategorie);
    const mots = config.vocabulaire;

    // On utilise `article`/`articlePluriel` (nouveaux mots ajoutés
    // dans categorieConfig) au lieu de "article" en dur.
    const articleLabel = mots.article || 'article';
    const articlePlurielLabel = mots.articlePluriel || 'articles';

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
          <Text style={styles.reference}>#{item.reference}</Text>
          {renderStatut(item.statut)}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.entrepriseName}>
            {item.entreprises?.nom || 'Entreprise inconnue'}
          </Text>
          <View style={styles.cardDetails}>
            <Text style={styles.totalItems}>
              {totalItems}{' '}
              {totalItems > 1 ? articlePlurielLabel : articleLabel}
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

  // ============================================================
  // ÉCRANS INTERMÉDIAIRES
  // ============================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (commandes.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune commande</Text>
        <Text style={styles.emptySub}>
          Vous n'avez pas encore passé de commande.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Accueil')}
        >
          <Text style={styles.browseButtonText}>Parcourir les produits</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>📦 Mes commandes</Text>
      </View>

      <FlatList
        data={commandes}
        keyExtractor={(item) =>
          item.id_commande?.toString() || Math.random().toString()
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={loadCommande}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 12 },
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
  entrepriseName: { fontSize: 15, fontWeight: '500', color: '#374151' },
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
  browseButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  browseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});