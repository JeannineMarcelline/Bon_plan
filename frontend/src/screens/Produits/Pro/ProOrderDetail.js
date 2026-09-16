import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getConfigCategorie } from '../../../Config/categorieConfig';

// Raisons d'annulation prédéfinies (Option B : liste + "Autre" libre)
const RAISONS_ANNULATION = [
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

  // Modale d'annulation
  const [modalVisible, setModalVisible] = useState(false);
  const [raisonChoisie, setRaisonChoisie] = useState(null);
  const [raisonLibre, setRaisonLibre] = useState('');

  // Toute la logique "cette catégorie a besoin de quoi" vient d'un seul
  // endroit centralisé (Config/categorieConfig.js), pas codée ici en dur.
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
      suivant: 'confirmée',
    },
    confirmée: {
      label: 'Confirmée',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: 'checkmark-circle-outline',
      suivant: besoinDuree ? null : 'expédiée',
    },
    expédiée: {
      label: 'Expédiée',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      icon: 'rocket-outline',
      suivant: 'livrée',
    },
    livrée: {
      label: 'Livrée ✅',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'checkmark-done-circle-outline',
      suivant: null,
    },
    annulée: {
      label: 'Annulée ❌',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: 'close-circle-outline',
      suivant: null,
    },
  };

  // Statuts sur lesquels le pro peut encore annuler
  const STATUTS_ANNULABLES = ['en_attente', 'confirmée'];

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
          raison_annulation,
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

  // ============================================================
  // CHANGEMENT DE STATUT (prochain statut uniquement)
  // ============================================================
  const changerStatut = async (nouveauStatut) => {
    const statutInfo = STATUTS[nouveauStatut];
    if (!statutInfo) return;

    // Vérif stock si passage à "confirmée"
    if (nouveauStatut === 'confirmée') {
      const { data: commandeData, error: commandeError } = await supabase
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

      if (commandeError) {
        Alert.alert('Erreur', 'Impossible de vérifier le stock.');
        return;
      }

      let stockInsuffisant = false;
      let message = '';
      for (const ligne of commandeData.ligne_commande || []) {
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
              // 1. Décrémenter le stock si passage à "confirmée"
              if (nouveauStatut === 'confirmée') {
                const { data: commandeData, error: commandeError } = await supabase
                  .from('commande')
                  .select(`ligne_commande (id_produit, quantite)`)
                  .eq('id_commande', commandeId)
                  .single();

                if (commandeError) throw commandeError;

                for (const ligne of commandeData.ligne_commande || []) {
                  await supabase.rpc('decrementer_stock', {
                    p_produit_id: ligne.id_produit,
                    p_quantite: ligne.quantite,
                  });
                }
              }

              // 2. Mettre à jour le statut
              const { error } = await supabase
                .from('commande')
                .update({ statut: nouveauStatut })
                .eq('id_commande', commandeId);

              if (error) throw error;

              // 3. Notifier le client
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
          },
        },
      ]
    );
  };

  // ============================================================
  // ANNULATION avec raison (modale)
  // ============================================================
  const ouvrirModaleAnnulation = () => {
    setRaisonChoisie(null);
    setRaisonLibre('');
    setModalVisible(true);
  };

  const fermerModaleAnnulation = () => {
    setModalVisible(false);
    setRaisonChoisie(null);
    setRaisonLibre('');
  };

  // Texte final de la raison
  const raisonFinale =
    raisonChoisie === 'Autre'
      ? raisonLibre.trim()
      : (raisonChoisie || '').trim();

  const raisonValide =
    raisonChoisie === 'Autre' ? raisonLibre.trim().length >= 5 : !!raisonChoisie;

  const confirmerAnnulation = async () => {
    if (!raisonValide) return;

    fermerModaleAnnulation();
    setUpdating(true);

    try {
      // 1. Remettre le stock si la commande était confirmée (ou expédiée,
      //    au cas où, mais on n'annule plus à ce stade)
      if (commande.statut === 'confirmée' || commande.statut === 'expédiée') {
        const { data: lignes, error: lignesError } = await supabase
          .from('ligne_commande')
          .select('id_produit, quantite')
          .eq('id_commande', commandeId);

        if (lignesError) throw lignesError;

        for (const ligne of lignes || []) {
          await supabase.rpc('incrementer_stock', {
            p_produit_id: ligne.id_produit,
            p_quantite: ligne.quantite,
          });
        }
      }

      // 2. Récupérer l'utilisateur connecté (pro) pour tracer qui annule
      const { data: userData } = await supabase.auth.getUser();
      const proId = userData?.user?.id || null;

      // 3. Mettre à jour la commande avec statut + raison + traçabilité
      const { error } = await supabase
        .from('commande')
        .update({
          statut: 'annulée',
          raison_annulation: raisonFinale,
          annulee_par: proId,
          date_annulation: new Date().toISOString(),
        })
        .eq('id_commande', commandeId);

      if (error) throw error;

      // 4. Notifier le client avec la raison
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          utilisateur_id: commande.id_client,
          titre: `${mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} #${commande.reference} annulée`,
          message: `Votre ${mots.commande} a été annulée. Raison : ${raisonFinale}`,
          lue: false,
        });
      if (notifError) console.error('Erreur notification annulation:', notifError);

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
  };

  const getStatut = (statut) => STATUTS[statut] || STATUTS.en_attente;

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        <Text style={styles.errorText}>
          {mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1)} introuvable
        </Text>
      </SafeAreaView>
    );
  }

  const statutInfo = getStatut(commande.statut);
  const lignes = commande.ligne_commande || [];
  const client = commande.utilisateurs || {};

  // UN SEUL bouton : le prochain statut uniquement
  const prochainStatut = STATUTS[commande.statut]?.suivant || null;

  // Annulation autorisée ?
  const peutAnnuler = STATUTS_ANNULABLES.includes(commande.statut);

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

        {/* Raison d'annulation (si annulée) */}
        {commande.statut === 'annulée' && commande.raison_annulation && (
          <View style={[styles.card, styles.cardAnnulation]}>
            <Text style={styles.cardTitle}>❌ Raison de l'annulation</Text>
            <Text style={styles.raisonText}>{commande.raison_annulation}</Text>
          </View>
        )}

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
          <Text style={styles.cardTitle}>
            📦 {mots.produitPluriel.charAt(0).toUpperCase() + mots.produitPluriel.slice(1)}
          </Text>
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
          <Text style={styles.cardTitle}>
            📍 {mots.livraison.charAt(0).toUpperCase() + mots.livraison.slice(1)}
          </Text>
          {besoinAdresse && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                {commande.adresse_livraison || 'Non renseignée'}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {commande.telephone_livraison || 'Non renseigné'}
            </Text>
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
              {commande.mode_paiement === 'cash'
                ? 'Paiement à la livraison'
                : commande.mode_paiement}
            </Text>
          </View>
        </View>

        {/* Carte Dates (catégories avec durée) */}
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

        {/* Carte Date de commande */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Date de commande</Text>
          <Text style={styles.dateText}>{formatDate(commande.date_commande)}</Text>
        </View>

        {/* ACTIONS */}
        {updating ? (
          <View style={styles.actionsContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.updatingText}>Mise à jour en cours...</Text>
          </View>
        ) : prochainStatut || peutAnnuler ? (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>🔧 Actions</Text>
            <View style={styles.buttonsRow}>
              {prochainStatut && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: STATUTS[prochainStatut].color },
                  ]}
                  onPress={() => changerStatut(prochainStatut)}
                >
                  <Ionicons name={STATUTS[prochainStatut].icon} size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    Passer en "{STATUTS[prochainStatut].label}"
                  </Text>
                </TouchableOpacity>
              )}

              {peutAnnuler && (
                <TouchableOpacity
                  style={styles.annulerButton}
                  onPress={ouvrirModaleAnnulation}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#fff" />
                  <Text style={styles.annulerButtonText}>Annuler la {mots.commande}</Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* MODALE ANNULATION */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={fermerModaleAnnulation}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Annuler la {mots.commande}</Text>
              <TouchableOpacity onPress={fermerModaleAnnulation}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choisissez une raison (obligatoire) :
            </Text>

            {RAISONS_ANNULATION.map((raison) => {
              const selected = raisonChoisie === raison;
              return (
                <TouchableOpacity
                  key={raison}
                  style={[styles.raisonItem, selected && styles.raisonItemSelected]}
                  onPress={() => setRaisonChoisie(raison)}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#DC2626' : '#9CA3AF'}
                  />
                  <Text style={[styles.raisonTextItem, selected && styles.raisonTextSelected]}>
                    {raison}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {raisonChoisie === 'Autre' && (
              <TextInput
                style={styles.textInput}
                placeholder="Précisez la raison (min. 5 caractères)"
                placeholderTextColor="#9CA3AF"
                value={raisonLibre}
                onChangeText={setRaisonLibre}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={fermerModaleAnnulation}
              >
                <Text style={styles.modalBtnCancelText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  !raisonValide && styles.modalBtnDisabled,
                ]}
                onPress={confirmerAnnulation}
                disabled={!raisonValide}
              >
                <Text style={styles.modalBtnConfirmText}>Confirmer l'annulation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 40 },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reference: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statutText: { fontSize: 13, fontWeight: '600' },
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
  cardAnnulation: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  raisonText: { fontSize: 14, color: '#991B1B', fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoText: { fontSize: 14, color: '#374151', flex: 1 },
  produitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  produitInfo: { flex: 1 },
  produitNom: { fontSize: 14, fontWeight: '500', color: '#111827' },
  produitDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  produitTotal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  dateText: { fontSize: 14, color: '#374151' },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10,
  },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
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
  buttonsRow: { width: '100%', gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  updatingText: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  terminalBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  terminalText: { fontSize: 16, fontWeight: '600', color: '#10B981' },
  annulerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  annulerButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  raisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 6,
  },
  raisonItemSelected: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  raisonTextItem: { fontSize: 14, color: '#374151' },
  raisonTextSelected: { color: '#991B1B', fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 70,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  modalBtnConfirm: { backgroundColor: '#DC2626' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalBtnDisabled: { backgroundColor: '#FCA5A5' },
});