import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getConfigCategorie } from '../../../Config/categorieConfig';

export default function MesProduits({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState([]);
  // Une seule entreprise pour ce pro, donc un seul vocabulaire pour tout l'écran
  const [mots, setMots] = useState(getConfigCategorie(null).vocabulaire);

  const loadProduits = async () => {
    try {
      const { data: entreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('id, categories ( nom )')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (entrepriseError) throw entrepriseError;
      if (!entreprise) {
        setProduits([]);
        return;
      }

      const config = getConfigCategorie(entreprise.categories?.nom || null);
      setMots(config.vocabulaire);

      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('id_entreprise', entreprise.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduits(data || []);

    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProduits();
    }, [])
  );

  // Désactive ou réactive un produit (jamais de vraie suppression, voir explication dans le chat)
  const toggleActif = async (produit) => {
    const nouvelEtat = !produit.actif;

    try {
      const { error } = await supabase
        .from('produits')
        .update({ actif: nouvelEtat })
        .eq('id', produit.id);

      if (error) throw error;

      setProduits((prev) =>
        prev.map((p) => (p.id === produit.id ? { ...p, actif: nouvelEtat } : p))
      );
    } catch (error) {
      console.error('Erreur changement statut produit:', error);
      Alert.alert('Erreur', `Impossible de modifier ${mots.produit === 'produit' ? 'ce produit' : `cette ${mots.produit}`}`);
    }
  };

  const confirmerDesactivation = (produit) => {
    if (produit.actif) {
      Alert.alert(
        `Désactiver ${mots.produit === 'produit' ? 'ce produit' : `cette ${mots.produit}`}`,
        `"${produit.nom_produit}" ne sera plus visible par les clients. Continuer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Désactiver', style: 'destructive', onPress: () => toggleActif(produit) },
        ]
      );
    } else {
      toggleActif(produit);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photos_produit?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.photo}
        />
        <View style={styles.infoWrap}>
          <View style={styles.nomRow}>
            <Text style={styles.nom} numberOfLines={1}>{item.nom_produit}</Text>
            {!item.actif && (
              <View style={styles.badgeInactif}>
                <Text style={styles.badgeInactifText}>Désactivé</Text>
              </View>
            )}
          </View>

          <Text style={styles.prix}>{item.prix_produit?.toLocaleString('fr-FR')} Ar</Text>

          <Text style={[styles.stock, item.stock === 0 && styles.stockZero]}>
            {item.stock > 0
              ? `${item.stock} ${item.stock > 1 ? mots.produitPluriel : mots.produit} disponible${item.stock > 1 ? 's' : ''}`
              : `Aucun${mots.produit === 'produit' ? '' : 'e'} ${mots.produit} disponible`}
          </Text>
          {item.stock > 0 && item.stock <= 5 && (
            <Text style={styles.stockBasText}>Disponibilité limitée</Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('AddProduit', { produitId: item.id })}
            >
              <Ionicons name="create-outline" size={16} color="#2563EB" />
              <Text style={styles.actionBtnText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => confirmerDesactivation(item)}
            >
              <Ionicons
                name={item.actif ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={item.actif ? '#DC2626' : '#10B981'}
              />
              <Text style={[styles.actionBtnText, { color: item.actif ? '#DC2626' : '#10B981' }]}>
                {item.actif ? 'Désactiver' : 'Réactiver'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes {mots.produitPluriel}</Text>
      </View>

      {produits.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun{mots.produit === 'produit' ? '' : 'e'} {mots.produit} pour l'instant</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduit')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter {mots.produit === 'produit' ? 'un' : 'une'} {mots.produit}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={produits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButtonFooter}
              onPress={() => navigation.navigate('AddProduit')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addButtonFooterText}>
                Ajouter {mots.produit === 'produit' ? 'un autre' : 'une autre'} {mots.produit}
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 12 },

  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photo: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F3F4F6' },
  infoWrap: { flex: 1, marginLeft: 12 },
  nomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nom: { fontSize: 15, fontWeight: '600', color: '#111827', flexShrink: 1 },
  badgeInactif: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeInactifText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  prix: { fontSize: 14, color: '#2563EB', fontWeight: '700', marginTop: 2 },
  stock: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  stockZero: { color: '#DC2626' },
  stockBasText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: '#2563EB' },

  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 10, marginBottom: 16 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  addButtonFooterText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
});