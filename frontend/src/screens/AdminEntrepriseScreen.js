import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function AdminEntrepriseScreen() {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entrepriseSelectionnee, setEntrepriseSelectionnee] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refusModalVisible, setRefusModalVisible] = useState(false);
  const [raisonRefus, setRaisonRefus] = useState('');
  const [entrepriseARefuser, setEntrepriseARefuser] = useState(null);

  const navigation = useNavigation();

  const loadEntreprises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entreprises')
        .select(`
          *,
          utilisateurs ( nom, email, telephone ),
          villes ( nom ),
          categories ( nom )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const entreprisesFormates = (data || []).map((e) => ({
        ...e,
        proprietaire: e.utilisateurs?.nom || 'Inconnu',
        proprietaireEmail: e.utilisateurs?.email || '',
        proprietaireTelephone: e.utilisateurs?.telephone || '',
        ville: e.villes?.nom || '',
        categorie: e.categories?.nom || '',
      }));

      setEntreprises(entreprisesFormates);
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      Alert.alert('Erreur', 'Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntreprises();
  }, []);


  const notifierProprietaire = async (entrepriseId, statut, nomEntreprise, raison = null) => {
    try {
      const { data: entreprise, error: entError } = await supabase
        .from('entreprises')
        .select('utilisateur_id')
        .eq('id', entrepriseId)
        .maybeSingle();

      if (entError || !entreprise?.utilisateur_id) {
        console.log('Propriétaire introuvable, notification ignorée');
        return;
      }

      const estValide = statut === 'valide';
      const titre = estValide ? 'Entreprise validée ' : 'Entreprise refusée ';

      let message = estValide
        ? `Félicitations ! "${nomEntreprise}" est maintenant visible dans l'app client.`
        : `"${nomEntreprise}" a été refusée par l'administrateur.`;

      // Si refus avec raison, on l'ajoute au message
      if (!estValide && raison) {
        message += ` Raison : ${raison}`;
      }

      await supabase.from('notifications').insert({
        utilisateur_id: entreprise.utilisateur_id,
        titre,
        message,
        lue: false,
      });
    } catch (error) {
      console.error('Erreur notification propriétaire:', error);
    }
  };

  const ouvrirRefusModal = (entreprise) => {
    setEntrepriseARefuser(entreprise);
    setRaisonRefus('');
    setRefusModalVisible(true);
  };

  const fermerRefusModal = () => {
    setRefusModalVisible(false);
    setEntrepriseARefuser(null);
    setRaisonRefus('');
  };

  const confirmerRefus = async () => {
    if (!raisonRefus.trim() || raisonRefus.trim().length < 5) {
      Alert.alert('Raison trop courte', "Veuillez saisir une raison d'au moins 5 caractères.");
      return;
    }

    const entreprise = entrepriseARefuser;
    const raison = raisonRefus.trim();

    fermerRefusModal();

    try {
      // 1. Mettre à jour le statut + la raison
      const { error } = await supabase
        .from('entreprises')
        .update({
          statutvalidation: 'refuse',
          raison_refus: raison,
        })
        .eq('id', entreprise.id);

      if (error) throw error;

      // 2. Notifier le propriétaire avec la raison
      await notifierProprietaire(entreprise.id, 'refuse', entreprise.nom, raison);

      Alert.alert('Succès', "L'entreprise a été refusée et le propriétaire a été notifié.");
      loadEntreprises();
    } catch (error) {
      console.error('Erreur refus:', error);
      Alert.alert('Erreur', "Impossible de refuser l'entreprise.");
    }
  };

  // ============================================================
  // CHANGEMENT DE STATUT (Valider / Refuser simple)
  // ============================================================
  const updateStatut = async (id, nouveauStatut, nom) => {
    const actionLabel = nouveauStatut === 'valide' ? 'valider' : 'refuser';

    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment ${actionLabel} "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: actionLabel === 'valider' ? 'Valider' : 'Refuser',
          style: actionLabel === 'valider' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('entreprises')
                .update({ statutvalidation: nouveauStatut })
                .eq('id', id);

              if (error) throw error;

              await notifierProprietaire(id, nouveauStatut, nom);

              const message =
                actionLabel === 'valider'
                  ? "Entreprise validée et visible dans l'app client !"
                  : "Entreprise refusée, elle n'apparaîtra pas dans l'app client.";
              Alert.alert('Succès', message);

              fermerModal();
              loadEntreprises();
            } catch (error) {
              console.error('Erreur mise à jour:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // DÉSACTIVER / RÉACTIVER
  // ============================================================
  const handleDesactiver = (id, nom) => {
    Alert.alert(
      "Désactiver l'entreprise",
      `Voulez-vous vraiment désactiver "${nom}" ?\n\nElle ne sera plus visible dans l'app client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: () => updateStatut(id, 'refuse', nom),
        },
      ]
    );
  };

  const handleReactive = (id, nom) => {
    Alert.alert(
      "Réactiver l'entreprise",
      `Voulez-vous vraiment réactiver "${nom}" ?\n\nElle sera de nouveau visible dans l'app client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réactiver',
          onPress: () => updateStatut(id, 'valide', nom),
        },
      ]
    );
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getStatutStyle = (statut) => {
    if (statut === 'valide') return styles.statutValide;
    if (statut === 'refuse') return styles.statutRefuse;
    return styles.statutEnAttente;
  };

  const getStatutLabel = (statut) => {
    if (statut === 'valide') return 'Validée';
    if (statut === 'refuse') return 'Refusée';
    return 'En attente';
  };

  const ouvrirModal = (entreprise) => {
    setEntrepriseSelectionnee(entreprise);
    setModalVisible(true);
  };

  const fermerModal = () => {
    setModalVisible(false);
    setEntrepriseSelectionnee(null);
  };

  // ============================================================
  // RENDU CARTE
  // ============================================================
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => ouvrirModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statutBadge, getStatutStyle(item.statutvalidation)]}>
            <Text style={styles.statutText}>{getStatutLabel(item.statutvalidation)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.proprietaire}</Text>
        </View>
        <Text style={styles.infoSeparator}>|</Text>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.ville}</Text>
        </View>
        <Text style={styles.infoSeparator}>|</Text>
        <View style={styles.infoItem}>
          <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.categorie}</Text>
        </View>
      </View>

      {item.statutvalidation === 'refuse' && (
        <View style={styles.tooltipContainer}>
          <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
          <Text style={styles.tooltipText}>Ne s'affiche pas dans l'app client</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Ionicons name="business-outline" size={28} color="#2563EB" />
          <Text style={styles.title}>Gestion des entreprises</Text>
        </View>
      </View>

      <FlatList
        data={entreprises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune entreprise enregistrée</Text>
          </View>
        }
      />

      {/* ============================================================
          MODALE DE DÉTAIL
      ============================================================ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={fermerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {entrepriseSelectionnee && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détail de l'entreprise</Text>
                  <TouchableOpacity onPress={fermerModal}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Identité */}
                  <View style={styles.modalIdentity}>
                    {entrepriseSelectionnee.logo ? (
                      <Image source={{ uri: entrepriseSelectionnee.logo }} style={styles.modalLogo} />
                    ) : (
                      <View style={styles.modalLogoPlaceholder}>
                        <Ionicons name="storefront-outline" size={40} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.modalNom}>{entrepriseSelectionnee.nom}</Text>
                    <View style={[styles.modalBadge, getStatutStyle(entrepriseSelectionnee.statutvalidation)]}>
                      <View style={styles.modalBadgeDot} />
                      <Text style={styles.modalBadgeText}>
                        {getStatutLabel(entrepriseSelectionnee.statutvalidation)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSeparator} />

                  {/* Propriétaire */}
                  <View style={styles.infoCard}>
                    <View style={[styles.infoCardIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="person" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoCardLabel}>Propriétaire</Text>
                      <Text style={styles.infoCardValue}>
                        {entrepriseSelectionnee.proprietaire || 'Non renseigné'}
                      </Text>
                      {entrepriseSelectionnee.proprietaireEmail ? (
                        <Text style={styles.infoCardSub}>{entrepriseSelectionnee.proprietaireEmail}</Text>
                      ) : null}
                      {entrepriseSelectionnee.proprietaireTelephone ? (
                        <Text style={styles.infoCardSub}>{entrepriseSelectionnee.proprietaireTelephone}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Localisation */}
                  <View style={styles.infoCard}>
                    <View style={[styles.infoCardIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="location" size={20} color="#D97706" />
                    </View>
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoCardLabel}>Localisation</Text>
                      <Text style={styles.infoCardValue}>
                        {entrepriseSelectionnee.ville || 'Ville non renseignée'}
                      </Text>
                      <Text style={styles.infoCardSub}>
                        {entrepriseSelectionnee.adresse || 'Adresse non renseignée'}
                      </Text>
                    </View>
                  </View>

                  {/* Catégorie */}
                  <View style={styles.infoCard}>
                    <View style={[styles.infoCardIcon, { backgroundColor: '#F5F3FF' }]}>
                      <Ionicons name="pricetag" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoCardLabel}>Catégorie</Text>
                      <Text style={styles.infoCardValue}>
                        {entrepriseSelectionnee.categorie || 'Non renseignée'}
                      </Text>
                    </View>
                  </View>

                  {/* Contact */}
                  {(entrepriseSelectionnee.telephone || entrepriseSelectionnee.siteweb) && (
                    <View style={styles.infoCard}>
                      <View style={[styles.infoCardIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="call" size={20} color="#059669" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoCardLabel}>Contact</Text>
                        {entrepriseSelectionnee.telephone ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${entrepriseSelectionnee.telephone}`)}
                          >
                            <Text style={[styles.infoCardValue, styles.infoCardLink]}>
                              {entrepriseSelectionnee.telephone}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {entrepriseSelectionnee.siteweb ? (
                          <TouchableOpacity
                            onPress={() => {
                              const url = entrepriseSelectionnee.siteweb.startsWith('http')
                                ? entrepriseSelectionnee.siteweb
                                : `https://${entrepriseSelectionnee.siteweb}`;
                              Linking.openURL(url);
                            }}
                          >
                            <Text style={[styles.infoCardSub, styles.infoCardLink]}>
                              {entrepriseSelectionnee.siteweb}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  <View style={styles.descriptionCard}>
                    <View style={styles.descriptionHeader}>
                      <Ionicons name="document-text" size={18} color="#6B7280" />
                      <Text style={styles.descriptionHeaderText}>Description</Text>
                    </View>
                    <Text style={styles.descriptionText}>
                      {entrepriseSelectionnee.description || 'Aucune description fournie par le propriétaire.'}
                    </Text>
                  </View>

                  {/* Raison de refus (si déjà refusée) */}
                  {entrepriseSelectionnee.statutvalidation === 'refuse' && entrepriseSelectionnee.raison_refus && (
                    <View style={styles.raisonRefusCard}>
                      <View style={styles.descriptionHeader}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" />
                        <Text style={[styles.descriptionHeaderText, { color: '#DC2626' }]}>
                          Raison du refus
                        </Text>
                      </View>
                      <Text style={styles.raisonRefusText}>
                        {entrepriseSelectionnee.raison_refus}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Actions */}
                <View style={styles.modalActions}>
                  {entrepriseSelectionnee.statutvalidation === 'en_attente' && (
                    <>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnRefuse]}
                        onPress={() => {
                          const ent = entrepriseSelectionnee;
                          fermerModal();
                          ouvrirRefusModal(ent);
                        }}
                      >
                        <Ionicons name="close-outline" size={18} color="#fff" />
                        <Text style={styles.modalBtnText}>Refuser</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnValide]}
                        onPress={() => {
                          fermerModal();
                          updateStatut(
                            entrepriseSelectionnee.id,
                            'valide',
                            entrepriseSelectionnee.nom
                          );
                        }}
                      >
                        <Ionicons name="checkmark-outline" size={18} color="#fff" />
                        <Text style={styles.modalBtnText}>Valider</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {entrepriseSelectionnee.statutvalidation === 'valide' && (
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnDesactiver]}
                      onPress={() => {
                        fermerModal();
                        handleDesactiver(entrepriseSelectionnee.id, entrepriseSelectionnee.nom);
                      }}
                    >
                      <Ionicons name="ban-outline" size={18} color="#fff" />
                      <Text style={styles.modalBtnText}>Désactiver</Text>
                    </TouchableOpacity>
                  )}

                  {entrepriseSelectionnee.statutvalidation === 'refuse' && (
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnReactive]}
                      onPress={() => {
                        fermerModal();
                        handleReactive(entrepriseSelectionnee.id, entrepriseSelectionnee.nom);
                      }}
                    >
                      <Ionicons name="refresh-outline" size={18} color="#fff" />
                      <Text style={styles.modalBtnText}>Réactiver</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODALE DE REFUS
      ============================================================ */}
      <Modal
        visible={refusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={fermerRefusModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.refusOverlay}
        >
          <View style={styles.refusContent}>
            <View style={styles.refusHeader}>
              <Text style={styles.refusTitle}>Refuser l'entreprise</Text>
              <TouchableOpacity onPress={fermerRefusModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.refusSubtitle}>
              Indiquez la raison du refus. Le propriétaire la recevra dans sa notification.
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {[
                'Informations incomplètes',
                'Nom inapproprié ou trompeur',
                'Doublon (entreprise déjà existante)',
                'Catégorie incorrecte',
                'Hors zone géographique',
                'Image inappropriée',
                'Autre',
              ].map((raison) => {
                const selected =
                  raisonRefus === raison ||
                  (raison === 'Autre' && raisonRefus.startsWith('Autre :'));

                return (
                  <TouchableOpacity
                    key={raison}
                    style={[styles.raisonItem, selected && styles.raisonItemSelected]}
                    onPress={() => {
                      if (raison === 'Autre') {
                        setRaisonRefus('Autre : ');
                      } else {
                        setRaisonRefus(raison);
                      }
                    }}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? '#DC2626' : '#9CA3AF'}
                    />
                    <Text
                      style={[styles.raisonItemText, selected && styles.raisonItemTextSelected]}
                    >
                      {raison}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {raisonRefus.startsWith('Autre :') && (
                <TextInput
                  style={styles.raisonInput}
                  placeholder="Précisez la raison..."
                  placeholderTextColor="#9CA3AF"
                  value={raisonRefus.replace('Autre : ', '')}
                  onChangeText={(txt) => setRaisonRefus(`Autre : ${txt}`)}
                  multiline
                />
              )}
            </ScrollView>

            <View style={styles.refusActions}>
              <TouchableOpacity
                style={[styles.refusBtn, styles.refusBtnCancel]}
                onPress={fermerRefusModal}
              >
                <Text style={styles.refusBtnCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.refusBtn,
                  styles.refusBtnConfirm,
                  (!raisonRefus.trim() || raisonRefus.trim().length < 5) && styles.refusBtnDisabled,
                ]}
                onPress={confirmerRefus}
                disabled={!raisonRefus.trim() || raisonRefus.trim().length < 5}
              >
                <Text style={styles.refusBtnConfirmText}>Confirmer le refus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', letterSpacing: -0.5 },
  backButton: { padding: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 },

  // Carte
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statutText: { fontSize: 12, fontWeight: '600' },
  statutEnAttente: { backgroundColor: '#FEF3C7' },
  statutValide: { backgroundColor: '#D1FAE5' },
  statutRefuse: { backgroundColor: '#FEE2E2' },

  cardInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 14, color: '#6B7280' },
  infoSeparator: { fontSize: 14, color: '#D1D5DB', marginHorizontal: 4 },

  tooltipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tooltipText: { fontSize: 12, color: '#9CA3AF' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },

  // ---------- MODALE DÉTAIL ----------
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 20 },

  modalIdentity: { alignItems: 'center', paddingVertical: 20 },
  modalLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#F3F4F6',
  },
  modalLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNom: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  modalBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c7b107' },
  modalBadgeText: { fontSize: 12, fontWeight: '700', color: '#c7b107', letterSpacing: 0.3 },

  modalSeparator: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: { flex: 1 },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoCardValue: { fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 20 },
  infoCardSub: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
  infoCardLink: { color: '#2563EB', textDecorationLine: 'underline' },

  descriptionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  descriptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  descriptionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Raison de refus (affichée si l'entreprise est déjà refusée)
  raisonRefusCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  raisonRefusText: { fontSize: 14, color: '#991B1B', lineHeight: 22, fontStyle: 'italic' },

  // ---------- ACTIONS MODALE ----------
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  modalBtnValide: { backgroundColor: '#16A34A' },
  modalBtnRefuse: { backgroundColor: '#DC2626' },
  modalBtnDesactiver: { backgroundColor: '#EA580C' },
  modalBtnReactive: { backgroundColor: '#2563EB' },

  // ---------- MODALE REFUS ----------
  refusOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  refusContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  refusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refusTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  refusSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  raisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 6,
  },
  raisonItemSelected: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  raisonItemText: { fontSize: 14, color: '#374151', flex: 1 },
  raisonItemTextSelected: { color: '#991B1B', fontWeight: '600' },
  raisonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  refusActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  refusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refusBtnCancel: { backgroundColor: '#F3F4F6' },
  refusBtnCancelText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  refusBtnConfirm: { backgroundColor: '#DC2626' },
  refusBtnConfirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  refusBtnDisabled: { backgroundColor: '#FCA5A5' },
});