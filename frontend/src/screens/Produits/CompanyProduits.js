import React, { useState, useEffect } from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function CompanyProduits() {
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const { idEntreprise } = route.params;

  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState([]);
  const [quantites, setQuantites] = useState({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const loadProduits = async () => {
      try {
        const { data, error } = await supabase
          .from('produits')
          .select('*')
          .eq('id_entreprise', idEntreprise)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProduits(data || []);
      } catch (error) {
        console.error('Erreur chargement produits:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProduits();
  }, [idEntreprise]);

  const changerQuantite = (produit, delta) => {
    setQuantites((prev) => {
      const actuelle = prev[produit.id_produit] || 0;
      const nouvelle = actuelle + delta;

      if (nouvelle < 0) return prev;
      if (nouvelle > produit.stock) return prev;

      return { ...prev, [produit.id_produit]: nouvelle };
    });
  };

  const produitsSelectionnes = produits.filter((p) => (quantites[p.id_produit] || 0) > 0);

  const totalArticles = produitsSelectionnes.reduce(
    (sum, p) => sum + quantites[p.id_produit], 0
  );

  const totalPrix = produitsSelectionnes.reduce(
    (sum, p) => sum + quantites[p.id_produit] * p.prix_produit, 0
  );

  const passerCommande = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour commander');
      return;
    }
    if (produitsSelectionnes.length === 0) {
      Alert.alert('Panier vide', 'Sélectionnez au moins un produit');
      return;
    }

    setEnvoi(true);
    try {
      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert({
          id_utilisateur: user.id,
          id_entreprise: idEntreprise,
          statut: 'en_attente_retrait',
          prix_total: totalPrix,
        })
        .select()
        .single();

      if (commandeError) throw commandeError;

      const lignes = produitsSelectionnes.map((p) => ({
        id_commande: commande.id,
        id_produit: p.id_produit,
        quantite: quantites[p.id_produit],
        prix_unitaire: p.prix_produit,
      }));

      const { error: lignesError } = await supabase
        .from('commande_produits')
        .insert(lignes);

      if (lignesError) throw lignesError;

      for (const p of produitsSelectionnes) {
        await supabase
          .from('produits')
          .update({ stock: p.stock - quantites[p.id_produit] })
          .eq('id_produit', p.id_produit);
      }

      Alert.alert('Commande envoyée', 'Votre commande a bien été enregistrée');
      setQuantites({});
      navigation.goBack();

    } catch (error) {
      console.error('Erreur commande:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la commande');
    } finally {
      setEnvoi(false);
    }
  };

  const renderItem = ({ item }) => {
    const quantite = quantites[item.id_produit] || 0;
    const rupture = item.stock === 0;

    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photos_produit?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.photo}
        />
        <View style={styles.infoWrap}>
          <Text style={styles.nom} numberOfLines={1}>{item.nom_produit}</Text>
          <Text style={styles.prix}>{item.prix_produit?.toLocaleString('fr-FR')} Ar</Text>
          <Text style={[styles.stock, rupture && styles.stockZero]}>
            {rupture ? 'Rupture de stock' : `${item.stock} disponible(s)`}
          </Text>
        </View>

        {!rupture && (
          <View style={styles.quantiteWrap}>
            <TouchableOpacity
              style={styles.quantiteBtn}
              onPress={() => changerQuantite(item, -1)}
              disabled={quantite === 0}
            >
              <Ionicons name="remove" size={16} color={quantite === 0 ? '#D1D5DB' : '#2563EB'} />
            </TouchableOpacity>
            <Text style={styles.quantiteText}>{quantite}</Text>
            <TouchableOpacity
              style={styles.quantiteBtn}
              onPress={() => changerQuantite(item, 1)}
            >
              <Ionicons name="add" size={16} color="#2563EB" />
            </TouchableOpacity>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Produits</Text>
      </View>

      {produits.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun produit disponible</Text>
        </View>
      ) : (
        <FlatList
          data={produits}
          keyExtractor={(item) => item.id_produit.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {totalArticles > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerCount}>{totalArticles} article(s)</Text>
            <Text style={styles.footerTotal}>{totalPrix.toLocaleString('fr-FR')} Ar</Text>
          </View>
          <TouchableOpacity
            style={[styles.commanderBtn, envoi && { opacity: 0.6 }]}
            onPress={passerCommande}
            disabled={envoi}
          >
            <Text style={styles.commanderBtnText}>
              {envoi ? 'Envoi...' : 'Commander'}
            </Text>
          </TouchableOpacity>
        </View>
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

  listContent: { padding: 16, paddingBottom: 100 },
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

  quantiteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  quantiteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantiteText: { fontSize: 15, fontWeight: '600', color: '#111827', minWidth: 16, textAlign: 'center' },

  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 10 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerCount: { fontSize: 12, color: '#6B7280' },
  footerTotal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  commanderBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  commanderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});