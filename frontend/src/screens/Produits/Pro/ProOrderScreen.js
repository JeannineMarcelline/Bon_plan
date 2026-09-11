import React, {useState, useEffect} from 'react';
import{
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../../../context/AuthContext';
import {supabase} from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';

export default function ProOrderScreen ({navigation}) {

const {user} = useAuth();
const [commande, setCommande] = useState([]);
const [entreprise, setEntreprise] = useState(null);
const [loading, setLoading] = useState(true);
const [categorieEntreprise, setCategorieEntreprise] = useState(null);

// Toute la logique "cette catégorie a besoin de quoi" vient d'un seul
// endroit centralisé (Config/categorieConfig.js), pas codée ici en dur.
const config = getConfigCategorie(categorieEntreprise);
const mots = config.vocabulaire;

//charger entreprise
const loadEntreprise = async () => {

try {
 const {data, error} = await supabase
 .from('entreprises')
 .select('id, nom, categories (nom)')
 .eq('utilisateur_id', user.id)
 .maybeSingle();

 if (error) throw error;

 setEntreprise(data);
 setCategorieEntreprise(data?.categories?.nom || null);
 return data;

}catch(error){
console.error('Erreur de chargement de entreprise', error);
return null;

}
};

// charger commande

const loadCommande = async () => {
if(!user) {
    setLoading(false);
    return;
}

try{
const entrepriseData = await loadEntreprise();

if(!entrepriseData){
    setLoading(false);
    return;
}

const {data, error} = await supabase
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
    utilisateurs:utilisateurs!commande_id_client_fkey (
            nom,
            email,
            telephone
          ),
    ligne_commande(
     quantite,
            prix_unitaire,
            produits (
              nom_produit,
              photos_produit
        )
    )
`)
.eq('id_entreprise', entrepriseData.id)
.order('date_commande', {ascending: false});

if(error) throw error;

setCommande(data || []);

}catch(error){
console.error('Erreur de chargement de commande', error);

}finally{
    setLoading(false);
}
};

useEffect(() => {
    loadCommande();
}, []);

// status

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

  const renderStatut = (statut) => {
   const config = STATUTS[statut] || STATUTS.en_attente;
    return (
      <View style={[styles.statutBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.statutText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  }

  // afficher une commande

  const renderItem = ({item}) => {

const totalItems = item.ligne_commande?.reduce(
    (sum, ligne) => sum + ligne.quantite,
    0
) || 0;

const client = item.utilisateurs || {};
const date = new Date(item.date_commande);

const dateFormatee  = date.toLocaleDateString('fr-FR', {
day: '2-digit',
month: 'short',
year: 'numeric'
});

return (
<TouchableOpacity
    style={styles.card}
    onPress={() => navigation.navigate('ProOrderDetail', {
        commandeId: item.id_commande
    })}
 >
<View style={styles.cardHeader}>
<Text style={styles.reference}>#{item.reference}</Text>
    {renderStatut(item.statut)}
</View>

<View style={styles.cardBody}>
<Text style={styles.clientName}>
 👤 {client.nom || 'Client inconnu'}
</Text>
 <View style={styles.cardDetails}>
<Text style={styles.totalItems}>
{totalItems} {totalItems > 1 ? mots.produitPluriel : mots.produit}
</Text>
<Text style={styles.totalPrice}>
              {item.prix_total?.toLocaleString('fr-FR') || 0} Ar
 </Text>
 </View>
</View>

  <View style={styles.cardFooter}>
          <Text style={styles.date}>{dateFormatee}</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </View>


</TouchableOpacity>
);

  };

  if(loading){
    return(
<SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
 </SafeAreaView>
    );
  }

  if(!entreprise){
    return(
        <SafeAreaView style={styles.center}>
  <Ionicons name="business-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune entreprise trouvée</Text>
        <Text style={styles.emptySub}>
          Vous devez créer votre entreprise pour voir les commandes.
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('AddCompany')}
        >
          <Text style={styles.createButtonText}>➕ Créer mon entreprise</Text>
        </TouchableOpacity>
        </SafeAreaView>
    );
  }
  
  if(commande.length === 0 ) {
   return(
    <SafeAreaView style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>📦 Aucune {mots.commande} reçue</Text>
        <Text style={styles.emptySub}>
          Vous n'avez pas encore reçu de {mots.commandePluriel} pour {entreprise.nom}.
    </Text>
    </SafeAreaView>
   );
  }

  return(
 <SafeAreaView style={styles.container}>
   <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>📋 {mots.commandePluriel.charAt(0).toUpperCase() + mots.commandePluriel.slice(1)} reçues</Text>
          <Text style={styles.subtitle}>{entreprise.nom}</Text>
        </View>
        <TouchableOpacity onPress={loadCommande} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>
 <FlatList
        data={commande}
        keyExtractor={(item) => item.id_commande.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={loadCommande}
        refreshing={loading}
/>
 </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
   title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 8,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalItems: {
    fontSize: 13,
    color: '#6B7280',
  },
   totalPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});