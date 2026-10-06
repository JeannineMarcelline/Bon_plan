import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

const METHODES_PAIEMENT = [

{
    key: 'MVola',
    nom: 'MVola',
    description: 'Telma Mobile Money',
    couleur: '#FFCC00',
    couleurTexte: '#297a10',
},
{
    key: 'Orange Money',
    nom: 'Orange Money',
    description: 'Orange Madagascar',
    couleur: '#FF7900', // Orange officiel
    couleurTexte: '#FFFFFF',
  },
  {
    key: 'Airtel Money',
    nom: 'Airtel Money',
    description: 'Airtel Madagascar',
    couleur: '#E40000', // Rouge Airtel
    couleurTexte: '#FFFFFF',
  },

]

export default function PaymentScreen(){

const { user } = useAuth();
const navigation = useNavigation();
const route = useRoute();

const { commande, reservation, type } = route.params || {};

const item = type === 'reservation' ? reservation : commande;
const isReservation = type === 'reservation';

const [methodeSelectionnee, setMethodeSelectionnee] = useState(null);
const [numero, setNumero] = useState('');
const [loading, setLoading] = useState(false);


const formatPhoneNumber = (text) => {
const cleaned = text.replace(/\D/g, '').slice(0, 10);

let formatted = '';

for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5 || i === 8) formatted += ' ';
      formatted += cleaned[i];
    }
return formatted;

};

const handlePayer = async () => {

 if(!methodeSelectionnee) {
    Alert.alert('Erreur', 'Veuillez choisir une méthode de paiement');
    return;
 }

 const digitsPhone = numero.replace(/\D/g, '');
 if(digitsPhone.length !== 10) {
  Alert.alert(
    'Numéro invalide',
    'Le numéro doit contenir 10 chiffre  (ex : 034 12 345 67).'
  );
  return;
 }
 setLoading(true);

 try{
  await new Promise((resolve) => setTimeout(resolve, 2000));

    // ⭐ Mise à jour selon le type
  const table = isReservation ? 'reservation_transport' : 'commande';
  const idField = isReservation ? 'id_reservation' : 'id_commande';

  const { error } = await supabase
    .from(table)
    .update({
      paye: true,
      date_paiement: new Date().toISOString(),
      mode_paiement_reel: methodeSelectionnee.key,
    })
    .eq(idField, item[idField]);

  if (error) throw error;

  // ⭐ Notifier le pro
  const { data: entrepriseData } = await supabase
    .from('entreprises')
    .select('utilisateur_id, nom')
    .eq('id', item.id_entreprise)
    .maybeSingle();

  if (entrepriseData?.utilisateur_id) {
    await supabase.from('notifications').insert({
      utilisateur_id: entrepriseData.utilisateur_id,
      titre: 'Paiement reçu',
      message: `${isReservation ? 'Réservation' : 'Commande'} #${item.reference || item[idField]} payée via ${methodeSelectionnee.nom}.`,
      lue: false,
    });
  }

  if (user?.id) {
    await supabase.from('notifications').insert({
      utilisateur_id: user.id,
      titre: 'Paiement confirmé',
      message: `Votre ${isReservation ? 'réservation' : 'commande'} #${item.reference || item[idField]} a été payée via ${methodeSelectionnee.nom}.`,
      lue: false,
    });
  }

  Alert.alert(
    'Paiement réussi',
    `Votre ${isReservation ? 'réservation' : 'commande'} #${item.reference || item[idField]} a été payée.\n\nMontant : ${Number(item.prix_total).toLocaleString('fr-FR')} Ar\nMéthode : ${methodeSelectionnee.nom}`,
    [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]
  );

 }catch(error){
 console.error('Erreur paiment:', error);
 Alert.alert('Erreur', 'Le paiement a échoué. Réessayer.');
 } finally{
    setLoading(false);
 }

};

 return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Paiement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Récap de la réservation */}
        <View style={styles.recapCard}>
          <Text style={styles.recapTitle}>Réservation à payer</Text>
           <Text style={styles.recapReference}>
            #{item?.reference || item?.id_reservation}
          </Text>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Montant à payer</Text>
            <Text style={styles.recapMontant}>
              {Number(item?.prix_total || 0).toLocaleString('fr-FR')} Ar
            </Text>
          </View>
        </View>

        {/* Choix de la méthode */}
        <Text style={styles.sectionTitle}>Choisissez votre méthode</Text>

        {METHODES_PAIEMENT.map((m) => {
          const selected = methodeSelectionnee?.key === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodeCard, selected && styles.methodeCardSelected]}
              onPress={() => setMethodeSelectionnee(m)}
              activeOpacity={0.7}
            >
              {/* Logo / badge coloré */}
              <View style={[styles.methodeLogo, { backgroundColor: m.couleur }]}>
                <Text style={[styles.methodeLogoText, { color: m.couleurTexte }]}>
                  {m.nom.split(' ')[0]}
                </Text>
              </View>

              <View style={styles.methodeInfo}>
                <Text style={styles.methodeNom}>{m.nom}</Text>
                <Text style={styles.methodeDescription}>{m.description}</Text>
              </View>

              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? '#2563EB' : '#9CA3AF'}
              />
            </TouchableOpacity>
          );
        })}

        {/* Numéro de téléphone */}
        {methodeSelectionnee && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Votre numéro {methodeSelectionnee.nom}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="034 12 345 67"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={13}
              value={numero}
              onChangeText={(t) => setNumero(formatPhoneNumber(t))}
              editable={!loading}
            />
            <Text style={styles.hint}>
              Vous recevrez une notification de confirmation sur ce numéro.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Bouton Payer */}
            {/* Bouton Payer + Info */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payerButton, loading && { opacity: 0.7 }]}
          onPress={handlePayer}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.payerButtonText}>
                Payer {Number(item?.prix_total || 0).toLocaleString('fr-FR')} Ar
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="lock-closed-outline" size={14} color="#10B981" />
          <Text style={styles.infoText}>
            Paiement 100% sécurisé · Confirmation immédiate
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
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
  content: { padding: 16, paddingBottom: 120 },

  recapCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recapTitle: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  recapReference: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  recapLabel: { fontSize: 14, color: '#6B7280' },
  recapMontant: { fontSize: 20, fontWeight: '700', color: '#1E3A5F' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  methodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  methodeCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodeLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodeLogoText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  methodeInfo: { flex: 1 },
  methodeNom: { fontSize: 15, fontWeight: '600', color: '#111827' },
  methodeDescription: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

    infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  payerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0f3b9c',       // ⭐ Bleu plus moderne
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});