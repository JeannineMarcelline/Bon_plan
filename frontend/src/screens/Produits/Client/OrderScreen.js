import React, {useState, useEffect, useRef} from "react";
import {
    Text, 
    ScrollView, 
    View, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet,
    Alert, 
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext'
import { supabase } from "../../../lib/supabase";
import { getConfigCategorie } from '../../../Config/categorieConfig';
import DateTimePicker from '@react-native-community/datetimepicker';



export default function OrderScreen({ navigation, route }) {

const { user } = useAuth();
const { cart, getTotal, clearCart, idEntreprise: idEntreprisePanier } = useCart();


const produitDirect = route.params?.produitDirect || null;
const idEntrepriseDirect = route.params?.idEntreprise || null;
const estModeDirect = produitDirect !== null;
const dateDebutParam = route.params?.dateDebut || null;
const dateFinParam = route.params?.dateFin || null;

const items = estModeDirect ? [produitDirect] : cart;
const idEntreprise = estModeDirect ? idEntrepriseDirect : idEntreprisePanier;
const total = estModeDirect
  ? (produitDirect.prix_produit * (produitDirect.quantite || 1))
  : getTotal();


const [adresse, setAdresse] = useState('');
const [telephone, setTelephone] = useState('');
const [notes, setNotes] = useState('');
const [loading, setLoading] = useState(false);
const isSubmitting = useRef(false);
const [categorieEntreprise, setCategorieEntreprise] = useState(null);
const [showPickerDebut, setShowPickerDebut] = useState(false);
const [showPickerFin, setShowPickerFin] = useState(false);
const [heureDebut, setHeureDebut] = useState(null);
const[heureFin, setHeureFin] = useState(null);
const [showTimePickerDebut, setShowTimePickerDebut] = useState(false);
const [showTimePickerFin, setShowTimePickerFin] = useState(false);

const [dateDebut, setDateDebut] = useState(
  dateDebutParam ? new Date(dateDebutParam) : null
);
const [dateFin, setDateFin] = useState(
  dateFinParam ? new Date(dateFinParam) : null
);


const config = getConfigCategorie(categorieEntreprise);
const besoinDuree = config.besoinDuree;
const besoinAdresse = config.besoinAdresse;
const mots = config.vocabulaire;

const generateReference = async() => {

const {data, error} = await supabase.rpc('generer_reference');

if(error){

  console.error('Erreur de generation de référence:', error);
  const date = new Date();

  const ref = `BPM-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`;
  return ref;
}

return data;

};

const formatPhoneNumber = (text) => {
const cleaned = text.replace(/\D/g, '').slice(0, 10);

let formatted = '';

for(let i = 0 ; i < cleaned.length; i++) {
  if (i === 3 || i === 5 || i === 8) formatted += ' ';
    formatted += cleaned[i];
}
return formatted;
};


useEffect(() => {
  const chargerCategorie = async () => {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from('entreprises')
      .select('categories (nom)')
      .eq('id', idEntreprise)
      .maybeSingle();

    if (error) {
      console.error('Erreur chargement catégorie:', error);
      return;
    }

    setCategorieEntreprise(data?.categories?.nom || null);
  };

  chargerCategorie();
}, [idEntreprise]);

const formatDateFr = (date) => {
  if (!date) return null;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};



const onChangeDateDebut = (event, selectedDate) => {
  // Sur Android, le picker se ferme après validation
  if (Platform.OS === 'android') setShowPickerDebut(false);

  if (event.type === 'dismissed') return;

  if (selectedDate) {
    setDateDebut(selectedDate);

    // Si dateFin est avant dateDebut, on la remet à dateDebut
    if (dateFin && dateFin < selectedDate) {
      setDateFin(null);
    }
  }
};

const onChangeDateFin = (event, selectedDate) => {
  if (Platform.OS === 'android') setShowPickerFin(false);
  if (event.type === 'dismissed') return;
  if (selectedDate) setDateFin(selectedDate);
};

//formatage heure

const formatHeureFr = (date) => {

if(!date) return null;

return date.toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});
};

const onChangeHeureDebut = (event, selectedTime) => {
if (Platform.OS === 'android') setShowTimePickerDebut(false);
if(event.type === 'dismissed') return;
if(selectedTime) setHeureDebut(selectedTime);
};

const onChangeHeureFin = (event, selectedTime) => {
if (Platform.OS === 'android') setShowTimePickerFin(false);
if(event.type === 'dismissed') return;
if(selectedTime) setHeureFin(selectedTime);
};

const combinerDateHeure = (date, heure) => {
  if(!date || ! heure) return null;
  const combinee = new Date(date);
  combinee.setHours(heure.getHours(), heure.getMinutes(), 0, 0);
  return combinee;
}


const handleSubmit = async () => {

if (isSubmitting.current) return; 
    isSubmitting.current = true;

  if (besoinDuree && (!dateDebut || !dateFin)) {
  Alert.alert('Erreur', 'Veuillez indiquer les dates de début et de fin');
  isSubmitting.current = false;
  return;
}

if (besoinDuree && (!heureDebut || !heureFin)) {
  Alert.alert('Erreur', 'Veuillez indiquer les heure d\'arrivée et de départ');
  isSubmitting.current = false;
  return;
}

if(besoinDuree) {

  const debutComplet = combinerDateHeure(dateDebut, heureDebut);
  const finComplet = combinerDateHeure(dateFin, heureFin);

  if(finComplet < debutComplet) {
  Alert.alert('Dates incohérentes',
    'La date et l\'heure de départ doivent être après la date et l\'heure d\'arrivée.'
  );

isSubmitting.current = false;
return;
}

if(
  dateFin.getTime() === dateDebut.getTime() && finComplet.getTime() <= debutComplet.getTime()
){
 Alert.alert('Heure incohérents',
  'Si l\'arrivée et le départ sont le même jour, l\'heure de départ doit être après l\'heure d\'arrivée.'
 );

 isSubmitting.current = false;
 return;

}
}

  const digitsPhone = telephone.replace(/\D/g, '');
if (!telephone.trim()) {
  Alert.alert('Erreur', 'Veuillez saisir votre téléphone');
  isSubmitting.current = false;
  return;
}

if (digitsPhone.length !== 10) {
  Alert.alert(
    'Téléphone invalide',
    'Le numéro doit contenir exactement 10 chiffres (ex : 034 12 345 67).'
  );
  isSubmitting.current = false;
  return;
}

if (items.length === 0) {
  Alert.alert(
    'Erreur',
    estModeDirect
      ? `Aucun ${mots.produit} sélectionné`
      : `Votre ${mots.panier} est vide`
  );
  isSubmitting.current = false;
  return;
}
    if(!idEntreprise){
        Alert.alert('Erreur', 'Aucune entreprise selectionner');
        isSubmitting.current = false;
        return;
    }

    setLoading(true);

    try{

const userId = user.id;
const reference = await generateReference();

const totalCommande = total;

// On verifie le stock avant
for (const item of items) {
  const { data: produit, error: stockError } = await supabase
    .from('produits')
    .select('stock')
    .eq('id', item.id)
    .maybeSingle();

  if (stockError || !produit) {
    Alert.alert('Erreur', 'Produit introuvable');
    setLoading(false);
    isSubmitting.current = false;
    return;
  }

  if (produit.stock < item.quantite) {
    Alert.alert(
      'Stock insuffisant',
      `"${item.nom_produit}" n'a plus que ${produit.stock} unité(s) disponible(s)`
    );
    setLoading(false);
    isSubmitting.current = false;
    return;
  }
}

   // créer la commande 
const { data: commande, error: commandeError } = await supabase
.from('commande')
.insert({
    id_client: userId,
    id_entreprise: idEntreprise,
    reference: reference,
    statut: 'en_attente',
    prix_total: totalCommande,
    adresse_livraison: besoinAdresse ? adresse.trim() : null,
    telephone_livraison: telephone.trim(),
    notes: notes.trim(),
    mode_paiement: 'cash',
    date_commande: new Date().toISOString(),
   date_debut: besoinDuree
  ? combinerDateHeure(dateDebut, heureDebut).toISOString()
  : null,
date_fin: besoinDuree
  ? combinerDateHeure(dateFin, heureFin).toISOString()
  : null,
})
.select()
.single();

if (commandeError) throw commandeError;

const lignes = items.map((item) => ({
  id_commande: commande.id_commande,
  id_produit: item.id,
  quantite: item.quantite || 1,
  prix_unitaire: item.prix_produit,
}));


const { error: ligneError } = await supabase
.from('ligne_commande')
.insert(lignes);

if (ligneError) throw ligneError;

// ============================================================
// NOTIFIER LE PROPRIÉTAIRE DE L'ENTREPRISE
// ============================================================
// On envoie une notif au pro pour qu'il voie la nouvelle
// commande/réservation dans sa cloche 🔔 (pas besoin qu'il
// ouvre "Mes commandes reçues" pour la découvrir).
try {
  // 1. Récupérer le propriétaire de l'entreprise
  const { data: entrepriseData, error: entError } = await supabase
    .from('entreprises')
    .select('utilisateur_id, nom')
    .eq('id', idEntreprise)
    .maybeSingle();

  if (entError) {
    console.error('Erreur récup entreprise pour notif:', entError);
  } else if (entrepriseData?.utilisateur_id) {
    // 2. Préparer le message
    const commandeLabel =
      mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1);

    let messageNotif = '';

    if (besoinDuree) {
      // Réservation (Hôtel, Cyber, Location...)
      const debutComplet = combinerDateHeure(dateDebut, heureDebut);
      const finComplet = combinerDateHeure(dateFin, heureFin);
      const debutStr = formatDateFr(debutComplet);
      const finStr = formatDateFr(finComplet);
      const nomProduit = items[0]?.nom_produit || mots.produit;

      messageNotif = `${commandeLabel} #${reference} — ${nomProduit} du ${debutStr} au ${finStr}`;
    } else {
      // Commande (Vente, Restaurant...)
      const totalItems = items.reduce(
        (sum, i) => sum + (i.quantite || 1),
        0
      );
      messageNotif = `${commandeLabel} #${reference} — ${totalItems} ${mots.article}${totalItems > 1 ? 's' : ''}`;
    }

    // 3. Insérer la notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        utilisateur_id: entrepriseData.utilisateur_id,
        titre: `Nouvelle ${mots.commande}`,
        message: messageNotif,
        lue: false,
      });

    if (notifError) {
      console.error('Erreur création notif pro:', notifError);
    }
  }
} catch (notifErr) {
  // On n'interrompt pas la commande si la notif échoue
  console.error('Erreur notif (non bloquant):', notifErr);
}


// En mode direct (réservation hôtel), on n'a jamais touché au panier.
if (!estModeDirect) {
  const { data: panierData } = await supabase
    .from('panier')
    .select('id_panier')
    .eq('id_client', userId)
    .eq('id_entreprise', idEntreprise)
    .maybeSingle();

  if (panierData) {
    await supabase
      .from('ligne_panier')
      .delete()
      .eq('id_panier', panierData.id_panier);
  }

  clearCart();
}

setAdresse('');
setTelephone('');
setNotes('');
setDateDebut(null);
setDateFin(null);
setHeureDebut(null);
setHeureFin(null);

const commandeLabel = mots.commande.charAt(0).toUpperCase() + mots.commande.slice(1);
const livraisonLabel = mots.livraison.charAt(0).toUpperCase() + mots.livraison.slice(1);

// En mode direct (réservation), on renvoie vers "Mes réservations" (avec filtre).
// En mode panier, on renvoie vers "Mes commandes".
const destinationScreen = estModeDirect ? 'MesReservations' : 'ClientOrders';

Alert.alert(
  `${commandeLabel} confirmée !`,
  `Votre ${mots.commande} #${reference} a été enregistrée avec succès.\n\nTotal: ${totalCommande.toLocaleString('fr-FR')} Ar${besoinAdresse ? `\n${livraisonLabel}: ${adresse.trim()}` : ''}`,
  [
    {
      text: `Voir mes ${mots.commandePluriel}`,
      // navigate (pas reset) : on empile l'écran destination SANS effacer
      // l'historique. Le bouton retour continuera de fonctionner.
      onPress: () => navigation.replace(destinationScreen),
    },
    {
      text: 'OK',
      onPress: () => navigation.goBack(),
    },
  ]
);

}
catch(error){

console.error('Erreur commande:', error);
Alert.alert('Erreur', `Impossible de valider la ${mots.commande}. Veuillez réessayer.`);
 }finally{
    setLoading(false);
    isSubmitting.current = false;
 }

};

return(
<SafeAreaView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
 <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
</TouchableOpacity>
<Text style={styles.title}>Validation de {mots.commande}</Text>
</View>
<KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
       <ScrollView contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
 <View style={styles.summaryCard}>
  <Text style={styles.summaryTitle}>📋 Récapitulatif</Text>
  {items.map((item, index) => (
    <View key={index} style={styles.summaryItem}>
      <Text style={styles.summaryItemName}>{item.nom_produit}</Text>
      <Text style={styles.summaryItemQty}>×{item.quantite || 1}</Text>
      <Text style={styles.summaryItemPrice}>
        {((item.prix_produit) * (item.quantite || 1)).toLocaleString('fr-FR')} Ar
      </Text>
    </View>
  ))}
  <View style={styles.summaryTotal}>
    <Text style={styles.summaryTotalLabel}>Total</Text>
    <Text style={styles.summaryTotalPrice}>{total.toLocaleString('fr-FR')} Ar</Text>
  </View>
</View>

        {/** Formulaire */}

         <View style={styles.formCard}>
          <Text style={styles.formTitle}>Informations de {mots.livraison}</Text>

          {besoinAdresse && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse de {mots.livraison} *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Lot IV 123 Bis, Antananarivo"
                value={adresse}
                onChangeText={setAdresse}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
                      <Text style={styles.label}>Téléphone *</Text>
                      <TextInput
                style={styles.input}
               placeholder="034 00 000 00"
               value={telephone}
               onChangeText={(text) => setTelephone(formatPhoneNumber(text))}
               keyboardType="phone-pad"
             maxLength={13}
/>
        </View>

     {besoinDuree && (
  <>
  {/* Date + heure de début */}
<View style={styles.inputGroup}>
  <Text style={styles.label}>Arrivée / début *</Text>
  <View style={styles.dateHeureRow}>
    <TouchableOpacity
      style={[styles.dateButton, styles.dateButtonFlex]}
      onPress={() => setShowPickerDebut(true)}
    >
      <Ionicons name="calendar-outline" size={20} color="#6B7280" />
      <Text style={[styles.dateButtonText, !dateDebut && styles.datePlaceholder]}>
        {dateDebut ? formatDateFr(dateDebut) : 'Date'}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.dateButton, styles.heureButtonFlex]}
      onPress={() => setShowTimePickerDebut(true)}
    >
      <Ionicons name="time-outline" size={20} color="#6B7280" />
      <Text style={[styles.dateButtonText, !heureDebut && styles.datePlaceholder]}>
        {heureDebut ? formatHeureFr(heureDebut) : 'Heure'}
      </Text>
    </TouchableOpacity>
  </View>

  {showPickerDebut && (
    <DateTimePicker
      value={dateDebut || new Date()}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      minimumDate={new Date()}
      onChange={onChangeDateDebut}
    />
  )}

  {showTimePickerDebut && (
    <DateTimePicker
      value={heureDebut || new Date()}
      mode="time"
      is24Hour={true}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={onChangeHeureDebut}
    />
  )}
</View>

    {/* Date de fin */}
    {/* Date + heure de fin */}
<View style={styles.inputGroup}>
  <Text style={styles.label}>Départ / fin *</Text>
  <View style={styles.dateHeureRow}>
    <TouchableOpacity
      style={[styles.dateButton, styles.dateButtonFlex]}
      onPress={() => {
        if (!dateDebut) {
          Alert.alert(
            'Choisissez d\'abord la date de début',
            'Veuillez sélectionner la date d\'arrivée avant la date de départ.'
          );
          return;
        }
        setShowPickerFin(true);
      }}
    >
      <Ionicons name="calendar-outline" size={20} color="#6B7280" />
      <Text style={[styles.dateButtonText, !dateFin && styles.datePlaceholder]}>
        {dateFin ? formatDateFr(dateFin) : 'Date'}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.dateButton, styles.heureButtonFlex]}
      onPress={() => {
        if (!dateDebut || !heureDebut) {
          Alert.alert(
            'Choisissez d\'abord l\'arrivée',
            'Veuillez sélectionner la date et l\'heure d\'arrivée avant de saisir le départ.'
          );
          return;
        }
        setShowTimePickerFin(true);
      }}
    >
      <Ionicons name="time-outline" size={20} color="#6B7280" />
      <Text style={[styles.dateButtonText, !heureFin && styles.datePlaceholder]}>
        {heureFin ? formatHeureFr(heureFin) : 'Heure'}
      </Text>
    </TouchableOpacity>
  </View>

  {showPickerFin && (
    <DateTimePicker
      value={dateFin || dateDebut || new Date()}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      minimumDate={dateDebut || new Date()}
      onChange={onChangeDateFin}
    />
  )}

  {showTimePickerFin && (
    <DateTimePicker
      value={heureFin || heureDebut || new Date()}
      mode="time"
      is24Hour={true}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={onChangeHeureFin}
    />
  )}
</View>
  </>
)}

         <View style={styles.inputGroup}>
                    <Text style={styles.label}>Instructions particulières</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
        
                  <View style={styles.paymentInfo}>
                    <Ionicons name="cash-outline" size={20} color="#2563EB" />
                    <Text style={styles.paymentText}>Paiement en Cash </Text>
                  </View>
                </View>
  </ScrollView>
      </KeyboardAvoidingView>
  <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#cd1e1e" />
          ) : (
            <Text style={styles.submitButtonText}>Confirmer la {mots.commande}</Text>
          )}
        </TouchableOpacity>
</View>
</SafeAreaView>

);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
     scrollContent: { padding: 16, paddingBottom: 100 },
    summaryCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    summaryItem: {
      flexDirection: 'row',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
summaryItemName: { flex: 1, fontSize: 14, color: '#374151' },
summaryItemQty: { fontSize: 14, color: '#6B7280', marginHorizontal: 8 },
summaryItemPrice: { fontSize: 14, fontWeight: '500', color: '#111827' },
summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
summaryTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  summaryTotalPrice: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
textArea: { height: 80, textAlignVertical: 'top' },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
paymentText: { fontSize: 14, color: '#1E40AF', fontWeight: '500' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom:35,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  dateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 14,
},
dateButtonText: {
  fontSize: 15,
  color: '#111827',
  flex: 1,
},
datePlaceholder: {
  color: '#9CA3AF',
},
dateHeureRow: {
  flexDirection: 'row',
  gap: 8,
},
dateButtonFlex: {
  flex: 1.4,
},
heureButtonFlex: {
  flex: 1,
},

});


