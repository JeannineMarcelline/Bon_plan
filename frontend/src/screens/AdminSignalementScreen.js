import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ⭐ Libellés des raisons (doit matcher ceux de CompanyScreen)
const RAISONS_LABELS = {
  contenu_abusif: 'Contenu abusif / insultant',
  info_fausse: 'Information fausse',
  photo_non_conforme: 'Photo non conforme',
  arnaque: 'Arnaque / fraude',
  autre: 'Autre',
};

export default function AdminSignalementScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filtreActif, setFiltreActif] = useState('en_attente');

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const loadSignalements = async () => {
    try {
           const { data: signalementsData, error: sigError } = await supabase
        .from('signalements')
        .select(`
          id,
          type,
          id_cible,
          raison,
          commentaire,
          statut,
          date_signalement,
          date_traitement,
          id_utilisateur,
          utilisateurs!signalements_id_utilisateur_fkey ( nom, telephone )
        `)
        .order('date_signalement', { ascending: false });

      if (sigError) throw sigError;

      // 2. Pour chaque signalement, aller chercher la cible (avis ou entreprise)
      const enrichis = await Promise.all(
        (signalementsData || []).map(async (sig) => {
          let cibleDetails = null;

          if (sig.type === 'avis') {
            const { data: avis } = await supabase
              .from('avis')
              .select('id_avis, note, commentaire, date_avis, id_entreprise, entreprises ( nom )')
              .eq('id_avis', sig.id_cible)
              .maybeSingle();

            cibleDetails = avis
              ? {
                  type: 'avis',
                  id: avis.id_avis,
                  note: avis.note,
                  commentaire: avis.commentaire,
                  entreprise_nom: avis.entreprises?.nom,
                }
              : { type: 'avis', supprime: true };
          } else if (sig.type === 'entreprise') {
            const { data: entreprise } = await supabase
              .from('entreprises')
              .select('id, nom, logo, statutvalidation')
              .eq('id', sig.id_cible)
              .maybeSingle();

            cibleDetails = entreprise
              ? {
                  type: 'entreprise',
                  id: entreprise.id,
                  nom: entreprise.nom,
                  logo: entreprise.logo,
                  statutvalidation: entreprise.statutvalidation,
                }
              : { type: 'entreprise', supprime: true };
          }

          return {
            ...sig,
            signaleur_nom: sig.utilisateurs?.nom || 'Anonyme',
            signaleur_telephone: sig.utilisateurs?.telephone,
            cible: cibleDetails,
          };
        })
      );

      setSignalements(enrichis);
    } catch (error) {
      console.error('Erreur chargement signalements:', error);
      Alert.alert('Erreur', 'Impossible de charger les signalements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSignalements();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSignalements();
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  // Ignorer : on marque juste le signalement comme "rejete"
  const ignorerSignalement = async (signalement) => {
    Alert.alert(
      'Ignorer ce signalement ?',
      'Le contenu signalé restera en ligne.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ignorer',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('signalements')
                .update({
                  statut: 'rejete',
                  traite_par: user.id,
                  date_traitement: new Date().toISOString(),
                })
                .eq('id', signalement.id);

              if (error) throw error;

              setSignalements((prev) =>
                prev.filter((s) => s.id !== signalement.id)
              );
              Alert.alert('Ignoré', 'Le signalement a été ignoré.');
            } catch (error) {
              console.error('Erreur ignorer:', error);
              Alert.alert('Erreur', "Impossible d'ignorer le signalement.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Traiter : on supprime la cible (avis) ou on bloque (entreprise)
  const traiterSignalement = async (signalement) => {
    const { cible, type } = signalement;

    // Cas : cible déjà supprimée
    if (cible?.supprime) {
      Alert.alert(
        'Cible introuvable',
        'Le contenu signalé n\'existe plus. Le signalement sera marqué comme traité.'
      );
      return marquerTraite(signalement);
    }

    const message =
      type === 'avis'
        ? 'Voulez-vous SUPPRIMER cet avis ?'
        : `Voulez-vous BLOQUER l'entreprise "${cible?.nom}" ?`;

    Alert.alert(
      'Traiter le signalement',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              // 1. Action sur la cible
              if (type === 'avis') {
                const { error } = await supabase
                  .from('avis')
                  .delete()
                  .eq('id_avis', cible.id);
                if (error) throw error;
              } else if (type === 'entreprise') {
                const { error } = await supabase
                  .from('entreprises')
                  .update({ statutvalidation: 'refuse' })
                  .eq('id', cible.id);
                if (error) throw error;
              }

              // 2. Marquer le signalement comme traité
              const { error: sigError } = await supabase
                .from('signalements')
                .update({
                  statut: 'traite',
                  traite_par: user.id,
                  date_traitement: new Date().toISOString(),
                })
                .eq('id', signalement.id);

              if (sigError) throw sigError;

              setSignalements((prev) =>
                prev.filter((s) => s.id !== signalement.id)
              );

              Alert.alert(
                'Traité',
                type === 'avis'
                  ? "L'avis a été supprimé."
                  : "L'entreprise a été bloquée."
              );
            } catch (error) {
              console.error('Erreur traiter:', error);
              Alert.alert('Erreur', 'Impossible de traiter le signalement.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const marquerTraite = async (signalement) => {
    setProcessing(true);
    try {
      await supabase
        .from('signalements')
        .update({
          statut: 'traite',
          traite_par: user.id,
          date_traitement: new Date().toISOString(),
        })
        .eq('id', signalement.id);

      setSignalements((prev) => prev.filter((s) => s.id !== signalement.id));
    } catch (error) {
      console.error('Erreur marquer traite:', error);
    } finally {
      setProcessing(false);
    }
  };

   // ⭐ Signalements filtrés selon la puce active
  const signalementsFiltres =
    filtreActif === 'tous'
      ? signalements
      : signalements.filter((s) => s.statut === filtreActif);

  // ⭐ Compteur par statut
  const compterStatut = (statut) =>
    statut === 'tous'
      ? signalements.length
      : signalements.filter((s) => s.statut === statut).length;


  const renderItem = ({ item }) => {
    const estAvis = item.type === 'avis';
    const raisonLabel = RAISONS_LABELS[item.raison] || item.raison;

    return (
      <View style={styles.card}>
        {/* En-tête : type + date */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.typeBadge,
              estAvis ? styles.typeBadgeAvis : styles.typeBadgeEntreprise,
            ]}
          >
            <Ionicons
              name={estAvis ? 'chatbubble-outline' : 'business-outline'}
              size={12}
              color={estAvis ? '#7C3AED' : '#DC2626'}
            />
            <Text
              style={[
                styles.typeBadgeText,
                { color: estAvis ? '#7C3AED' : '#DC2626' },
              ]}
            >
              {estAvis ? 'Avis' : 'Entreprise'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.date_signalement).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
            })}
          </Text>
        </View>

        {/* Raison */}
        <Text style={styles.raisonLabel}>RAISON</Text>
        <Text style={styles.raisonText}>{raisonLabel}</Text>

        {/* Commentaire du signaleur */}
        {item.commentaire ? (
          <>
            <Text style={[styles.raisonLabel, { marginTop: 10 }]}>
              DÉTAILS DU SIGNALEMENT
            </Text>
            <Text style={styles.commentaireText}>"{item.commentaire}"</Text>
          </>
        ) : null}

        {/* Cible */}
        <Text style={[styles.raisonLabel, { marginTop: 10 }]}>
          CONTENU SIGNALÉ
        </Text>
        {item.cible?.supprime ? (
          <Text style={styles.cibleSupprime}>Contenu déjà supprimé</Text>
        ) : estAvis ? (
          <View style={styles.cibleBox}>
            <Text style={styles.cibleAvisNote}>
              {'★'.repeat(item.cible?.note || 0)}
              {'☆'.repeat(5 - (item.cible?.note || 0))}
            </Text>
            <Text style={styles.cibleAvisText} numberOfLines={3}>
              "{item.cible?.commentaire}"
            </Text>
            {item.cible?.entreprise_nom && (
              <Text style={styles.cibleAvisEntreprise}>
                Chez {item.cible.entreprise_nom}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.cibleBoxEntreprise}>
            {item.cible?.logo ? (
              <Image
                source={{ uri: item.cible.logo }}
                style={styles.cibleLogo}
              />
            ) : (
              <View style={[styles.cibleLogo, styles.cibleLogoPlaceholder]}>
                <Ionicons name="business-outline" size={20} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cibleEntrepriseNom}>
                {item.cible?.nom}
              </Text>
              <Text style={styles.cibleEntrepriseStatut}>
                Statut : {item.cible?.statutvalidation || '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Signaleur */}
        <View style={styles.signaleurRow}>
          <Ionicons name="person-outline" size={12} color="#6B7280" />
          <Text style={styles.signaleurText}>
            Signalé par {item.signaleur_nom}
            {item.signaleur_telephone ? ` · ${item.signaleur_telephone}` : ''}
          </Text>
        </View>

                {/* Actions — uniquement si le signalement est en attente */}
        {item.statut === 'en_attente' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.ignorerBtn}
              onPress={() => ignorerSignalement(item)}
              disabled={processing}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.ignorerBtnText}>Ignorer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.traiterBtn}
              onPress={() => traiterSignalement(item)}
              disabled={processing}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.traiterBtnText}>
                {estAvis ? "Supprimer l'avis" : "Bloquer l'entreprise"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statutInfo}>
            <Ionicons
              name={
                item.statut === 'traite'
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={14}
              color={item.statut === 'traite' ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.statutInfoText,
                { color: item.statut === 'traite' ? '#065F46' : '#6B7280' },
              ]}
            >
              {item.statut === 'traite'
                ? 'Signalement traité'
                : 'Signalement rejeté'}
              {item.date_traitement
                ? ` le ${new Date(item.date_traitement).toLocaleDateString(
                    'fr-FR',
                    { day: '2-digit', month: 'short' }
                  )}`
                : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Signalements</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {compterStatut('en_attente')}
          </Text>
        </View>
      </View>

      {/* ⭐ BARRE DE FILTRES */}
      <View style={styles.filtresWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtresContent}
        >
          {[
            { key: 'en_attente', label: 'En attente' },
            { key: 'traite', label: 'Traités' },
            { key: 'rejete', label: 'Rejetés' },
            { key: 'tous', label: 'Tous' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filtrePuce,
                filtreActif === f.key && styles.filtrePuceActive,
              ]}
              onPress={() => setFiltreActif(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filtrePuceText,
                  filtreActif === f.key && styles.filtrePuceTextActive,
                ]}
              >
                {f.label}
              </Text>
              <View
                style={[
                  styles.filtreCompteur,
                  filtreActif === f.key && styles.filtreCompteurActive,
                ]}
              >
                <Text
                  style={[
                    styles.filtreCompteurText,
                    filtreActif === f.key && styles.filtreCompteurTextActive,
                  ]}
                >
                  {compterStatut(f.key)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTE */}
      {signalementsFiltres.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {filtreActif === 'en_attente'
              ? 'Aucun signalement en attente'
              : filtreActif === 'traite'
              ? 'Aucun signalement traité'
              : filtreActif === 'rejete'
              ? 'Aucun signalement rejeté'
              : 'Aucun signalement'}
          </Text>
          <Text style={styles.emptyText}>
            {filtreActif === 'en_attente'
              ? 'Tout est à jour, bravo !'
              : 'Essayez un autre filtre.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={signalementsFiltres}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  countBadge: {
    backgroundColor: '#DC2626',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Liste
  list: { padding: 16, paddingBottom: 32 },

  // Carte
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeAvis: { backgroundColor: '#F5F3FF' },
  typeBadgeEntreprise: { backgroundColor: '#FEE2E2' },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },
  dateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  // Raison
  raisonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  raisonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  commentaireText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Cible : avis
  cibleBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  cibleAvisNote: {
    fontSize: 14,
    color: '#f39c12',
    marginBottom: 4,
    letterSpacing: 2,
  },
  cibleAvisText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cibleAvisEntreprise: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },

  // Cible : entreprise
  cibleBoxEntreprise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  cibleLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cibleLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cibleEntrepriseNom: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  cibleEntrepriseStatut: {
    fontSize: 11,
    color: '#6B7280',
  },
  cibleSupprime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  // Signaleur
  signaleurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  signaleurText: { fontSize: 11, color: '#6B7280' },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ignorerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
  },
  ignorerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  traiterBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 10,
  },
  traiterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Vide
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
    emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },

  // ⭐ Barre de filtres
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

  // ⭐ Statut des signalements déjà traités
  statutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 4,
  },
  statutInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
