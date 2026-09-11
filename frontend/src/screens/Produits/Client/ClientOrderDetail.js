import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';

export default function ClientOrderDetail({ navigation, route }) {
  const { commandeId } = route.params;
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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
          date_debut,
          date_fin,
          adresse_livraison,
          telephone_livraison,
          notes,
          mode_paiement,
          entreprises (nom, logo, categories (nom)),
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

  const formatDateSimple = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

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

  // Vocabulaire adapté selon la catégorie de l'entreprise concernée
  const nomCategorie = commande.entreprises?.categories?.nom || null;
  const config = getConfigCategorie(nomCategorie);
  const besoinAdresse = config.besoinAdresse;
  const besoinDuree = config.besoinDuree;
  const mots = config.vocabulaire;

  const handleAnnulationClient = () => {
    Alert.alert(
      `Annuler la ${mots.commande}`,
      `Voulez vous vraiment annuler la ${mots.commande} #${commande.reference} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const { error } = await supabase
                .from('commande')
                .update({ statut: 'annulée' })
                .eq('id_commande', commandeId)
                .eq('statut', 'en_attente');

              if (error) throw error;
              Alert.alert(
                `${mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} annulée`,
                `Votre ${mots.commande} a bien été annulée.`
              );
              await loadCommande();
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', `Impossible d'annuler la ${mots.commande}`);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

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
        <Text style={styles.title}>
          Détail de la {mots.commande}
        </Text>
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

        {/* Carte Produits / Chambres / Postes... */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📦 {mots.produitPluriel.charAt(0).toUpperCase() + mots.produitPluriel.slice(1)} {besoinDuree ? 'réservé(e)s' : 'commandés'}
          </Text>
          {lignes.length === 0 ? (
            <Text style={styles.emptyText}>Aucun {mots.produit}</Text>
          ) : (
            lignes.map((ligne, index) => (
              <View key={index} style={styles.produitItem}>
                <View style={styles.produitInfo}>
                  <Text style={styles.produitNom}>
                    {ligne.produits?.nom_produit || mots.produit}
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

        {/* Carte Dates (si séjour/session/événement) */}
        {besoinDuree && (commande.date_debut || commande.date_fin) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Dates du {mots.livraison}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="log-in-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                Début : {formatDateSimple(commande.date_debut) || 'Non renseigné'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="log-out-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                Fin : {formatDateSimple(commande.date_fin) || 'Non renseigné'}
              </Text>
            </View>
          </View>
        )}

        {/* Carte Livraison (seulement si la catégorie en a besoin) */}
        {besoinAdresse && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              📍 {mots.livraison.charAt(0).toUpperCase() + mots.livraison.slice(1)}
            </Text>
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
        )}

        {/* Si pas d'adresse, on affiche quand même le téléphone et le paiement séparément */}
        {!besoinAdresse && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ℹ️ Contact</Text>
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
                {commande.mode_paiement === 'cash' ? 'Paiement sur place' : commande.mode_paiement}
              </Text>
            </View>
          </View>
        )}

        {/* Carte Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Date de {mots.commande}</Text>
          <Text style={styles.dateText}>{formatDate(commande.date_commande)}</Text>
        </View>

        {commande.statut === 'en_attente' && (
          <TouchableOpacity
            style={styles.annulerButton}
            onPress={handleAnnulationClient}
            disabled={updating}
          >
            <Ionicons name="close-circle-outline" size={18} color="#fff" />
            <Text style={styles.annulerButtonText}>Annuler ma {mots.commande}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  annulerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  annulerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});