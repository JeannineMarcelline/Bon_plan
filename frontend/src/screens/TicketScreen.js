import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

export default function TicketScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { idReservation } = route.params;

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // CHARGEMENT DE LA RÉSERVATION
  // ============================================================
  useEffect(() => {
    const loadReservation = async () => {
      try {
        const { data, error } = await supabase
          .from('reservation_transport')
          .select(`
            id_reservation,
            date_reservation,
            statut,
            prix_total,
            paye,
            utilisateurs ( nom ),
            vehicules ( nom, ville_depart, ville_arrivee, date_depart, heure_depart, entreprises ( nom ) ),
            reservation_places ( places (numero_place) )
          `)
          .eq('id_reservation', idReservation)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const numeros = (data.reservation_places || [])
            .map((rp) => rp.places?.numero_place)
            .filter(Boolean);

          setReservation({
            ...data,
            client_nom: data.utilisateurs?.nom,
            vehicule_nom: data.vehicules?.nom,
            entreprise_nom: data.vehicules?.entreprises?.nom,
            ville_depart: data.vehicules?.ville_depart,
            ville_arrivee: data.vehicules?.ville_arrivee,
            date_depart: data.vehicules?.date_depart,
            heure_depart: data.vehicules?.heure_depart,
            places: numeros.join(', '),
          });
        }
      } catch (error) {
        console.error('Erreur de chargement de billet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReservation();
  }, [idReservation]);

  // ============================================================
  // GÉNÉRATION DU PDF (uniquement si payé)
  // ============================================================
  const handleDownloadPdf = async () => {
    // Sécurité : on ne génère un reçu que si c'est payé
    if (!reservation?.paye) return;

    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; color: #1A1A2E; padding: 32px; background-color: #F9FAFB; }
              .header { text-align: center; margin-bottom: 24px; }
              .header h1 { font-size: 22px; margin: 0; color: #1E3A5F; }
              .header p { font-size: 12px; color: #6B7280; margin: 4px 0 0 0; letter-spacing: 1px; text-transform: uppercase; }
              .ticket { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px; max-width: 480px; margin: 0 auto; }
              .entreprise { font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 2px; }
              .sous-titre { font-size: 12px; color: #9CA3AF; margin-bottom: 16px; }
              .badge-paye { display: inline-block; background: #DCFCE7; color: #16A34A; font-weight: bold; font-size: 12px; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; }
              .divider { border: none; border-top: 1px solid #F3F4F6; margin: 16px 0; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
              .row .label { color: #6B7280; }
              .row .value { color: #111827; font-weight: 600; text-align: right; }
              .total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
              .total-label { font-size: 13px; color: #6B7280; }
              .total-value { font-size: 24px; font-weight: bold; color: #1E3A5F; }
              .footer { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Bon Plan Madagascar</h1>
              <p>Reçu de réservation</p>
            </div>

            <div class="ticket">
              <div class="entreprise">${reservation.entreprise_nom || ''}</div>
              <div class="sous-titre">${reservation.vehicule_nom || ''}</div>

              <span class="badge-paye">✓ Payé</span>

              <hr class="divider" />

              <div class="row">
                <span class="label">Client</span>
                <span class="value">${reservation.client_nom || ''}</span>
              </div>
              <div class="row">
                <span class="label">Trajet</span>
                <span class="value">${reservation.ville_depart} → ${reservation.ville_arrivee}</span>
              </div>
              <div class="row">
                <span class="label">Départ</span>
                <span class="value">${reservation.date_depart} à ${reservation.heure_depart}</span>
              </div>
              <div class="row">
                <span class="label">Place(s)</span>
                <span class="value">n° ${reservation.places}</span>
              </div>

              <hr class="divider" />

              <div class="total-row">
                <span class="total-label">Total payé</span>
                <span class="total-value">${reservation.prix_total} Ar</span>
              </div>
            </div>

            <p class="footer">Billet n° ${reservation.id_reservation}</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    }
  };

  // ============================================================
  // ÉCRANS DE CHARGEMENT / ERREUR
  // ============================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#D1D5DB" />
        <Text style={styles.errorText}>Billet introuvable</Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // RENDU
  // ============================================================
  const estPaye = reservation.paye === true;
  const estAnnulee = reservation.statut === 'annulee';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {estPaye ? 'Mon billet' : 'Ma réservation'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.ticketCard}>
          {/* ---------- Bandeau statut ---------- */}
          {estAnnulee ? (
            <View style={[styles.statutBanner, styles.statutBannerAnnulee]}>
              <Ionicons name="close-circle" size={16} color="#DC2626" />
              <Text style={[styles.statutBannerText, { color: '#DC2626' }]}>
                Annulée
              </Text>
            </View>
          ) : estPaye ? (
            <View style={[styles.statutBanner, styles.statutBannerPaye]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={[styles.statutBannerText, { color: '#16A34A' }]}>
                Payé
              </Text>
            </View>
          ) : (
            <View style={[styles.statutBanner, styles.statutBannerAttente]}>
              <Ionicons name="time" size={16} color="#D97706" />
              <Text style={[styles.statutBannerText, { color: '#D97706' }]}>
                En attente de paiement
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* ---------- Détails ---------- */}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{reservation.client_nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{reservation.entreprise_nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="bus-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{reservation.vehicule_nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {reservation.ville_depart} → {reservation.ville_arrivee}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {reservation.date_depart} à {reservation.heure_depart}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="grid-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>Place(s) n° {reservation.places}</Text>
          </View>

          <View style={styles.divider} />

          {/* ---------- Total ---------- */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {estPaye ? 'Total payé' : 'Total à payer'}
            </Text>
            <Text style={styles.totalValue}>{reservation.prix_total} Ar</Text>
          </View>
        </View>

        {/* ---------- Note informative ---------- */}
        <Text style={styles.footerNote}>
          Numéro de billet : #{reservation.id_reservation}
        </Text>

        {/* ---------- Bouton Payer (si pas payé et pas annulé) ---------- */}
        {!estPaye && !estAnnulee && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#D97706" />
            <Text style={styles.infoBoxText}>
              Pour payer, retournez à la liste de vos réservations et appuyez sur
              le bouton "Payer".
            </Text>
          </View>
        )}

        {/* ---------- Bouton Télécharger PDF (uniquement si payé) ---------- */}
        {estPaye && (
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleDownloadPdf}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#1E3A5F" />
            <Text style={styles.pdfButtonText}>Télécharger le reçu (PDF)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E' },

  scrollContent: { padding: 20, paddingBottom: 40, alignItems: 'center' },

  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // Bandeau statut (remplace l'ancien payeBadge unique)
  statutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  statutBannerPaye: { backgroundColor: '#DCFCE7' },
  statutBannerAttente: { backgroundColor: '#FEF3C7' },
  statutBannerAnnulee: { backgroundColor: '#FEE2E2' },
  statutBannerText: { fontWeight: '700', fontSize: 13 },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginVertical: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  infoText: { fontSize: 14, color: '#374151', flexShrink: 1 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },

  footerNote: { fontSize: 12, color: '#9CA3AF', marginTop: 16 },

  // Boîte d'info (pour indiquer comment payer)
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    width: '100%',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    width: '100%',
  },
  pdfButtonText: {
    color: '#1E3A5F',
    fontWeight: '700',
    fontSize: 14,
  },
});