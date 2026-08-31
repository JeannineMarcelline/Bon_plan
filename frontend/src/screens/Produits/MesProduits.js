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
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function MesProduits({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState([]);

  const loadProduits = async () => {
    try {
      const { data: entreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('id')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (entrepriseError) throw entrepriseError;
      if (!entreprise) {
        setProduits([]);
        return;
      }

      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('id_entreprise', entreprise.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduits(data || []);

    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger vos produits');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProduits();
    }, [])
  );

  const confirmDelete = (produit) => {
    Alert.alert(
      'Supprimer ce produit ?',
      `"${produit.nom_produit}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteProduit(produit.id_produit) },
      ]
    );
  };

  const deleteProduit = async (id) => {
    try {
      const { error } = await supabase.from('produits').delete().eq('id', id);
      if (error) throw error;

      setProduits((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      Alert.alert('Erreur', 'Impossible de supprimer ce produit');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.photos_produit?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.photo}
      />
      <View style={styles.infoWrap}>
        <Text style={styles.nom} numberOfLines={1}>{item.nom_produit}</Text>
        <Text style={styles.prix}>{item.prix_produit?.toLocaleString('fr-FR')} Ar</Text>
        <Text style={[styles.stock, item.stock === 0 && styles.stockZero]}>
          {item.stock > 0 ? `${item.stock} en stock` : 'Rupture de stock'}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.title}>Mes produits</Text>
      </View>

      {produits.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun produit pour l'instant</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduit')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter un produit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={produits}
          keyExtractor={(item) => item.id_produit.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButtonFooter}
              onPress={() => navigation.navigate('AddProduit')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.addButtonFooterText}>Ajouter un autre produit</Text>
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
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photo: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F3F4F6' },
  infoWrap: { flex: 1, marginLeft: 12 },
  nom: { fontSize: 15, fontWeight: '600', color: '#111827' },
  prix: { fontSize: 14, color: '#2563EB', fontWeight: '700', marginTop: 2 },
  stock: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  stockZero: { color: '#DC2626' },
  deleteBtn: { padding: 8 },

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