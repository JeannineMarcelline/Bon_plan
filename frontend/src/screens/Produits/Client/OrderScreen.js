import React, {useState, useEffect, use} from "react";
import {
    Text, 
    ScrollView, 
    View, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet,
    Alert, 
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext'
import { supabase } from "../../../lib/supabase";

export default function OrderScreen({ navigation, route }) {

const { user } = useAuth();
const {cart, getTotal, clearCart, idEntreprise} = useCart();
const { total } = route.params || { total: getTotal() };

const [adresse, setAdresse] = useState('');
const [telephone, setTelephone] = useState('');
const [notes, setNotes] = useState('');
const [loading, setLoading] = useState(false);

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


const handleSubmit = async () => {
    if(!adresse.trim()) {
    Alert.alert('Erreur', 'Vous devez saisir votre adresse de Livraison');
    return;
    }
    if(!telephone.trim()){
        Alert.alert('Erreur', 'Veuillez saisir votre telephone');
        return;
    }

    if(!cart.lenght === 0) {
        Alert.alert('Erreur', 'Votre panier est vide');
        return;
    }
    if(!idEntreprise){
        Alert.alert('Erreur', 'Aucune entreprise selectionner');
        return;
    }
    setLoading(true);

    try{

const userId = user.id;
const reference = await generateReference();

const totalCommande = getTotal();

// On verifie le stock avant
for (const item of cart) {
  const { data: produit, error: stockError } = await supabase
    .from('produits')
    .select('stock')
    .eq('id', item.id)
    .maybeSingle();

  if (stockError || !produit) {
    Alert.alert('Erreur', 'Produit introuvable');
    return;
  }

  if (produit.stock < item.quantite) {
    Alert.alert(
      'Stock insuffisant',
      `"${item.nom_produit}" n'a plus que ${produit.stock} unité(s) disponible(s)`
    );
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
    adresse_livraison: adresse.trim(),
    telephone_livraison: telephone.trim(),
    notes: notes.trim(),
    mode_paiement: 'cash',
    date_commande: new Date().toISOString(),
})
.select()
.single();

if (commandeError) throw commandeError;

const lignes = cart.map((item ) => ({
id_commande : commande.id_commande,
id_produit : item.id,
quantite : item.quantite,
prix_unitaire : item.prix_produit,

}));

const { error: ligneError } = await supabase
.from('ligne_commande')
.insert(lignes);

if (ligneError) throw ligneError;

//ahena ny stock

for (const item of cart) {
const { error: stockError } = await supabase.rpc('decrementer_stock',{
    p_produit_id: item.id,
    p_quantite: item.quantite,
});

if(stockError) console.error('Erreur stock:', stockError);
}

// vider le panier

const {data: panierData} = await supabase
.from('panier')
.select('id_panier')
.eq('id_client', userId)
.eq('id_entreprise', idEntreprise)
.maybeSingle();

if(panierData) {
await supabase.from('ligne_panier').delete().eq('id_panier', panierData.id_panier);

}

clearCart();

Alert.alert(
    'Commande confirmée !',
    `Votre commande #${reference} a été enregistrée avec succès.\n\nTotal: ${totalCommande.toLocaleString('fr-FR')} Ar\nLivraison: ${adresse.trim()}`,
    [
      {
        text: 'Voir mes commandes',
        onPress:() => navigation.navigate('ClientOrders'),
      },
      {
        text: 'OK',
        onPress: () => navigation.navigate('Accueil'),
      },
    ]
);

}
catch(error){

console.error('Erreur commande:', error);
Alert.alert('Erreur', 'Impossible de valider la commande. Veuillez réessayer.');
 }finally{
    setLoading(false);
 }

};

return(
<SafeAreaView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
 <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
</TouchableOpacity>
<Text style={styles.title}>Validation de commande</Text>
</View>

  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 Récapitulatif</Text>
          {cart.map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>{item.nom_produit}</Text>
              <Text style={styles.summaryItemQty}>×{item.quantite}</Text>
              <Text style={styles.summaryItemPrice}>
                {(item.prix_produit * item.quantite).toLocaleString('fr-FR')} Ar
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
          <Text style={styles.formTitle}> Informations de livraison</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse de livraison *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Lot IV 123 Bis, Antananarivo"
              value={adresse}
              onChangeText={setAdresse}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.inputGroup}>
                      <Text style={styles.label}>Téléphone *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="032 00 000 00"
                        value={telephone}
                        onChangeText={setTelephone}
                        keyboardType="phone-pad"
                      />
        </View>

         <View style={styles.inputGroup}>
                    <Text style={styles.label}>Instructions particulières</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Heure de livraison, code d'accès, etc."
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
        
                  <View style={styles.paymentInfo}>
                    <Ionicons name="cash-outline" size={20} color="#2563EB" />
                    <Text style={styles.paymentText}>Paiement à la livraison (Cash)</Text>
                  </View>
                </View>
  </ScrollView>
  <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#cd1e1e" />
          ) : (
            <Text style={styles.submitButtonText}>Confirmer la commande</Text>
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
    content: { padding: 16, paddingBottom: 100 },
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
});



