import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context'
import { getConfigCategorie } from '../../../Config/categorieConfig';

const Raisons_annulation = [
 'Rupture de stock',
  'Trop de demandes en cours',
  'Erreur de prix',
  'Erreur de disponibilité',
  'Problème de livraison',
  'Autre',
];

export default function ProOrderDetailScreen({ navigation, route }) {

  const { commandeId } = route.params;
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [categorieEntreprise, setCategorieEntreprise] = useState(null);

  // modal de l'annulation

  const [modalVisible, setModalVisible] = useState(false);
  const [raisonChoisie, setRaisonChoisie] = useState(null);
  const [raisonLibre, setRaisonLibre] = useState('')


  const config = getConfigCategorie(categorieEntreprise);
  const besoinAdresse = config.besoinAdresse;
  const besoinDuree = config.besoinDuree;
  const mots = config.vocabulaire;


  const STATUTS = {
    en_attente: {
      label: 'En attente',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: 'time-outline',
      suivant: 'confirmée'
    },
    confirmée: {
      label: 'Confirmée',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: 'checkmark-circle-outline',
      // Pour une réservation (catégorie "avec durée"), rien à expédier ou
      // livrer : "Confirmée" est le dernier statut du côté du pro. Le
      // séjour/location se termine à date_fin, pas via une action manuelle.
      suivant: besoinDuree ? null : 'expédiée'
    },
    expédiée: {
      label: 'Expédiée',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      icon: 'rocket-outline',
      suivant: 'livrée'
    },
    livrée: {
      label: 'Livrée ✅',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'checkmark-done-circle-outline',
      suivant: null
    },
    annulée: {
      label: 'Annulée ❌',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: 'close-circle-outline',
      suivant: null
    }
  };



  const loadCommande = async () => {
    try {
      const { data, error } = await supabase
        .from('commande')
        .select(`
          id_commande,
          id_client,
          id_entreprise,
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
          utilisateurs:utilisateurs!commande_id_client_fkey (
            nom,
            email,
            telephone
          ),
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

      // Charge la catégorie de l'entreprise pour adapter le vocabulaire
      if (data?.id_entreprise) {
        const { data: entrepriseData, error: entError } = await supabase
          .from('entreprises')
          .select('categories (nom)')
          .eq('id', data.id_entreprise)
          .maybeSingle();

        if (entError) {
          console.error('Erreur chargement catégorie entreprise:', entError);
        } else {
          setCategorieEntreprise(entrepriseData?.categories?.nom || null);
        }
      }
    } catch (error) {
      console.error('Erreur chargement détail commande:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommande();
  }, []);

  
  // ProOrderDetailScreen.js

const changerStatut = async (nouveauStatut) => {
  const statutInfo = STATUTS[nouveauStatut];
  if (!statutInfo) return;

  // Vérifier si on a assez de stock (pour le passage à "confirmée")
  if (nouveauStatut === 'confirmée') {
    // Récupérer les produits
    const { data: commande, error: commandeError } = await supabase
      .from('commande')
      .select(`
        ligne_commande (
          id_produit,
          quantite,
          produits (nom_produit, stock)
        )
      `)
      .eq('id_commande', commandeId)
      .single();

    if (commandeError) throw commandeError;

    // Vérifier le stock
    let stockInsuffisant = false;
    let message = '';
    for (const ligne of commande.ligne_commande) {
      const stockActuel = ligne.produits?.stock || 0;
      const nomProduit = ligne.produits?.nom_produit || 'Produit';
      if (stockActuel < ligne.quantite) {
        stockInsuffisant = true;
        message = `"${nomProduit}" : stock disponible ${stockActuel}, commandé ${ligne.quantite}`;
        break;
      }
    }

    if (stockInsuffisant) {
      Alert.alert('⚠️ Stock insuffisant', message);
      return;
    }
  }

  // Confirmation
  Alert.alert(
    'Changer le statut',
    `Passer la ${mots.commande} #${commande.reference} en "${statutInfo.label}" ?`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          setUpdating(true);
          try {
            // 1. Si on passe à "confirmée", diminuer le stock
            if (nouveauStatut === 'confirmée') {
              const { data: commande, error: commandeError } = await supabase
                .from('commande')
                .select(`
                  ligne_commande (id_produit, quantite)
                `)
                .eq('id_commande', commandeId)
                .single();

              if (commandeError) throw commandeError;

              for (const ligne of commande.ligne_commande) {
                await supabase.rpc('decrementer_stock', {
                  p_produit_id: ligne.id_produit,
                  p_quantite: ligne.quantite
                });
              }
            }

            // 2. Mettre à jour le statut
            const { error } = await supabase
              .from('commande')
              .update({ statut: nouveauStatut })
              .eq('id_commande', commandeId);

            if (error) throw error;

            // 3. Notifier le client — seulement maintenant que le statut est
            // réellement mis à jour, et seulement si le pro a confirmé.
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                utilisateur_id: commande.id_client,
                titre: `${mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} #${commande.reference}`,
                message: `Votre ${mots.commande} est maintenant "${statutInfo.label}"`,
                lue: false,
              });
            if (notifError) console.error('Erreur notification:', notifError);

            Alert.alert('✅ Succès', `Statut mis à jour : ${statutInfo.label}`);
            await loadCommande();
          } catch (error) {
            console.error('Erreur changement statut:', error);
            Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
          } finally {
            setUpdating(false);
          }
        }
      }
    ]
  );
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

 // ProOrderDetailScreen.js

const handleAnnulation = () => {
  Alert.alert(
    `⚠️ Annuler la ${mots.commande}`,
    `Voulez-vous vraiment annuler la ${mots.commande} #${commande.reference} ?`,
    [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            // 1. Si le stock a déjà été diminué (statut confirmée ou expédiée), on le remet
            if (commande.statut === 'confirmée' || commande.statut === 'expédiée') {
              // Récupérer les produits de la commande
              const { data: lignes, error: lignesError } = await supabase
                .from('ligne_commande')
                .select('id_produit, quantite')
                .eq('id_commande', commandeId);

              if (lignesError) throw lignesError;

              // Remettre le stock pour chaque produit
              for (const ligne of lignes) {
                await supabase.rpc('incrementer_stock', {
                  p_produit_id: ligne.id_produit,
                  p_quantite: ligne.quantite
                });
              }
            }

            // 2. Mettre à jour le statut
            const { error } = await supabase
              .from('commande')
              .update({ statut: 'annulée' })
              .eq('id_commande', commandeId);

            if (error) throw error;

            Alert.alert(
              `${mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} annulée`,
              `La ${mots.commande} a bien été annulée.`
            );
            await loadCommande();
          } catch (error) {
            console.error('Erreur annulation:', error);
            Alert.alert('Erreur', `Impossible d'annuler la ${mots.commande}.`);
          } finally {
            setUpdating(false);
          }
        }
      }
    ]
  );
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
        <Text style={styles.errorText}>{mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} introuvable</Text>
      </SafeAreaView>
    );
  }

  const statutInfo = getStatut(commande.statut);
  const lignes = commande.ligne_commande || [];
  const client = commande.utilisateurs || {};

  // Liste des statuts suivants disponibles
  const statutsSuivants = [];
  let current = commande.statut;
  while (STATUTS[current]?.suivant) {
    const suivant = STATUTS[current].suivant;
    statutsSuivants.push(suivant);
    current = suivant;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Détail de la {mots.commande}</Text>
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

        {/* Carte Client */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Client</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{client.nom || 'Nom inconnu'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{client.email || 'Email inconnu'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{client.telephone || 'Téléphone inconnu'}</Text>
          </View>
        </View>

        {/* Carte Produits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 {mots.produitPluriel.charAt(0).toUpperCase() + mots.produitPluriel.slice(1)}</Text>
          {lignes.length === 0 ? (
            <Text style={styles.emptyText}>Aucun {mots.produit}</Text>
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
          <Text style={styles.cardTitle}>📍 {mots.livraison.charAt(0).toUpperCase() + mots.livraison.slice(1)}</Text>
          {besoinAdresse && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{commande.adresse_livraison || 'Non renseignée'}</Text>
            </View>
          )}
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

        {/* Carte Dates (uniquement pour les catégories avec durée) */}
        {besoinDuree && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Dates de {mots.livraison}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>Début : {formatDate(commande.date_debut)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>Fin : {formatDate(commande.date_fin)}</Text>
            </View>
          </View>
        )}

        {/* Carte Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Date de commande</Text>
          <Text style={styles.dateText}>{formatDate(commande.date_commande)}</Text>
        </View>

        {/*
            BOUTONS DE CHANGEMENT DE STATUT*/}
        {statutsSuivants.length > 0 && !updating ? (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>🔧 Actions</Text>
            <View style={styles.buttonsRow}>
              {statutsSuivants.map((statutKey) => {
                const statut = STATUTS[statutKey];
                return (
                  <TouchableOpacity
                    key={statutKey}
                    style={[styles.actionButton, { backgroundColor: statut.color }]}
                    onPress={() => changerStatut(statutKey)}
                  >
                    <Ionicons name={statut.icon} size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Passer en "{statut.label}"</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Bouton Annuler (si commande pas encore livrée ou annulée) */}
       {commande.statut !== 'livrée' && commande.statut !== 'annulée' && (
     <TouchableOpacity
    style={styles.annulerButton}
    onPress={handleAnnulation}
    disabled={updating}
    >
    <Ionicons name="close-circle-outline" size={18} color="#fff" />
    <Text style={styles.annulerButtonText}>Annuler la {mots.commande}</Text>
  </TouchableOpacity>
)}
            </View>
          </View>
        ) : updating ? (
          <View style={styles.actionsContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.updatingText}>Mise à jour en cours...</Text>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <View style={styles.terminalBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.terminalText}>
                {mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} : {statutInfo.label}
              </Text>
            </View>
          </View>
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
  actionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  buttonsRow: {
    width: '100%',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  updatingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  terminalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  terminalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  // Dans button annuler
annulerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#DC2626',
  borderRadius: 10,
  paddingVertical: 12,
  gap: 8,
  marginTop: 8,
  width: '100%',
},
annulerButtonText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 14,
},
});