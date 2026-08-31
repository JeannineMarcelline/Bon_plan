// screens/Produits/Client/ClientOrderDetailScreen.js
// ============================================================
// DÉTAIL D'UNE COMMANDE
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

export default function ClientOrderDetail({ navigation, route }) {
  const { commandeId } = route.params;
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // CHARGER LE DÉTAIL DE LA COMMANDE
  // ============================================================

  const loadCommande = async () => {
    try {
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
          mode_paiement,
          entreprises (nom, logo),
          ligne_commande (
            quantite,
            prix_unitaire,
            total_ligne,
            produits (
              id,
              nom_produit,
              photos_produit,
              prix_produit
            )
          )
        `)
        .eq('id_commande', commandeId)
        .maybeSingle();

      if (error) throw error;
      setCommande(data);
    } catch (error) {
      console.error('Erreur chargement détail commande:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommande();
  }, []);

  // ============================================================
  // AFFICHER LE STATUT
  // ============================================================

  const STATUTS = {
    en_attente: {
      label: 'En attente',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: 'time-outline'
    },
    confirmée: {
      label: 'Confirmée',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: 'checkmark-circle-outline'
    },
    expédiée: {
      label: 'Expédiée',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      icon: 'rocket-outline'
    },
    livrée: {
      label: 'Livrée',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'checkmark-done-circle-outline'
    },
    annulée: {
      label: 'Annulée',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: 'close-circle-outline'
    }
  };

  const getStatut = (statut) => {
    return STATUTS[statut] || STATUTS.en_attente;
  };

  // ============================================================
  // FORMATER LA DATE
  // ============================================================

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================
  // CHARGEMENT
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!commande) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Commande introuvable</Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // AFFICHAGE
  // ============================================================

  const statutInfo = getStatut(commande.statut);
  const lignes = commande.ligne_commande || [];
  const entreprise = commande.entreprises || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Détail de la commande</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Référence + Statut */}
        <View style={styles.referenceContainer}>
          <Text style={styles.reference}>#{commande.reference}</Text>
          <View style={[styles.statutBadge, { backgroundColor: statutInfo.bgColor }]}>
            <Ionicons name={statutInfo.icon} size={16} color={statutInfo.color} />
            <Text style={[styles.statutText, { color: statutInfo.color }]}>
              {statutInfo.label}
            </Text>
          </View>
        </View>

        {/* Carte Entreprise */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏢 Entreprise</Text>
          <View style={styles.entrepriseRow}>
            {entreprise.logo ? (
              <Image source={{ uri: entreprise.logo }} style={styles.entrepriseLogo} />
            ) : (
              <View style={styles.entrepriseLogoPlaceholder}>
                <Ionicons name="storefront-outline" size={24} color="#6B7280" />
              </View>
            )}
            <Text style={styles.entrepriseNom}>{entreprise.nom || 'Entreprise'}</Text>
          </View>
        </View>

        {/* Carte Produits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Produits commandés</Text>
          {lignes.length === 0 ? (
            <Text style={styles.emptyText}>Aucun produit</Text>
          ) : (
            lignes.map((ligne, index) => (
              <View key={index} style={styles.produitItem}>
                <View style={styles.produitInfo}>
                  <Text style={styles.produitNom}>
                    {ligne.produits?.nom_produit || 'Produit'}
                  </Text>
                  <Text style={styles.produitDetail}>
                    {ligne.quantite} × {ligne.prix_unitaire?.toLocaleString('fr-FR') || 0} Ar
                  </Text>
                </View>
                <Text style={styles.produitTotal}>
                  {ligne.total_ligne?.toLocaleString('fr-FR') || 0} Ar
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              {commande.prix_total?.toLocaleString('fr-FR') || 0} Ar
            </Text>
          </View>
        </View>

        {/* Carte Livraison */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Livraison</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{commande.adresse_livraison || 'Non renseignée'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{commande.telephone_livraison || 'Non renseigné'}</Text>
          </View>
          {commande.notes && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{commande.notes}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {commande.mode_paiement === 'cash' ? 'Paiement à la livraison' : commande.mode_paiement}
            </Text>
          </View>
        </View>

        {/* Carte Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Date de commande</Text>
          <Text style={styles.dateText}>{formatDate(commande.date_commande)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reference: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  entrepriseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entrepriseLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  entrepriseLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entrepriseNom: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  produitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  produitInfo: {
    flex: 1,
  },
  produitNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  produitDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  produitTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});