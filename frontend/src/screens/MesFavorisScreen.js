import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function MesFavorisScreen(){

const navigation = useNavigation();
const {user} = useAuth();
const [favoris, setFavoris] = useState([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const loadFavoris = async () => {

if(!user){
    setFavoris([]);
    setLoading(false);
    return;
}

try{
    const {data, error} = await supabase
    .from('favoris')
    .select(`
     id,
          date_ajout,
          entreprises (
            id,
            nom,
            logo,
            description,
            adresse,
            telephone,
            statutvalidation,
            villes ( nom ),
            categories ( nom )
          )   
        `)
    .eq('id_utilisateur', user.id)
    .order('date_ajout', {ascending: false});

    if(error) throw error;

    const formates = (data || [])
     .filter((f) => f.entreprises?.statutvalidation === 'valide')
        .map((f) => ({
          id_favori: f.id,
          date_ajout: f.date_ajout,
          ...f.entreprises,
          ville: f.entreprises?.villes?.nom || '',
          categorie: f.entreprises?.categories?.nom || '',
        }));
        setFavoris(formates);
}catch(error){
console.error('Erreur chargement favoris:', error);
}finally{
    setLoading(false);
    setRefreshing(false);
}
};

useFocusEffect(
    useCallback(() => {
        loadFavoris();
    }, [user])
);

const onRefresh = () => {
    setRefreshing(true);
    loadFavoris();
};

const renderItem = ({ item }) => (

<TouchableOpacity
 style={styles.card} 
 activeOpacity={0.75}
  onPress={ () =>
    navigation.navigate('Company', { id: item.id })
      }
>
{item.logo ? (
<Image source={{ uri: item.logo }} style={styles.logo} />
) : (
   <View style={[styles.logo, styles.logoPlaceholder]}>
    <Ionicons name="business-outline" size={26} color="#9CA3AF" />
   </View>  
)}

<View style={styles.info}>
        <Text style={styles.nom} numberOfLines={1}>
          {item.nom}
        </Text>
        <Text style={styles.categorie} numberOfLines={1}>
          {item.categorie}
          {item.ville ? ` · ${item.ville}` : ''}
        </Text>
        {item.adresse ? (
          <View style={styles.adresseRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.adresse} numberOfLines={1}>
              {item.adresse}
            </Text>
          </View>
        ) : null}
      </View>
 <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />  
</TouchableOpacity>
);

if(loading){
    return(
        <SafeAreaView style={styles.center}>
         <ActivityIndicator size="large" color="#2563EB" />
        </SafeAreaView>
    );
}

return(
<SafeAreaView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={() => navigation.goBack()}  style={styles.backBtn} >
 <Ionicons name="arrow-back" size={22} color="#111827" />
 </TouchableOpacity>
<Text style={styles.title}>Mes Favoris</Text>
</View>

{favoris.length === 0 ? (
<View style={styles.empty}>
 <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptyText}>
            Appuyez sur le cœur d'une entreprise pour l'ajouter ici.
 </Text>
</View>
) : (
<FlatList 
 data={favoris}
          keyExtractor={(item) => String(item.id_favori)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
/>
)}
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  list: { padding: 16, paddingBottom: 32 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  nom: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  categorie: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  adresseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adresse: { fontSize: 11, color: '#9CA3AF' },

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
    lineHeight: 20,
  }, 

});