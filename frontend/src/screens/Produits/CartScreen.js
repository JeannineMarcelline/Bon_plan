import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function CartScreen() {
  const navigation = useNavigation();
const { user } = useAuth();
const {cart, removeFromCart, updateQuantity, getTotal,  getItemCount, clearCart, idEntreprise} = useCart();

const total = getTotal();
const itemCount = getItemCount();

const handleCheckout = () => {
    if(!user) {
     Alert.alert('Connexion requise', 'Veuillez vous connecter pour passer commande');
    navigation.navigate('Login');
    return;
}

if(cart.length === 0) {
    Alert.alert('Panier vide', 'Ajouter des produits avant de passer commande');
    return;
}

if(!idEntreprise){
  Alert.alert('Erreur', 'Aucune entreprise sélectionner');
  return;
}

navigation.navigate('Accueil', {
  screen: 'Order',
  params: { total: total }
});

};

const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.photos_produit?.[0] || 'https://via.placeholder.com/80' }}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.nom} numberOfLines={1}>{item.nom_produit}</Text>
        <Text style={styles.prix}>{item.prix_produit} Ar</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateQuantity(item.id, item.quantite - 1, item.stock)}
          >
            <Ionicons name="remove" size={18} color="#1E3A5F" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantite}</Text>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateQuantity(item.id, item.quantite + 1, item.stock)}
          >
            <Ionicons name="add" size={18} color="#1E3A5F" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Confirmation',
            `Retirer "${item.nom_produit}" du panier ?`,
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Retirer', style: 'destructive', onPress: () => removeFromCart(item.id) }
            ]
          );
           }}
      >
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <Text style={styles.emptySub}>Découvrez nos produits et ajoutez-les à votre panier.</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Accueil')}
        >
             <Text style={styles.browseButtonText}>Parcourir les produits</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

   return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Mon panier</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearText}>Tout supprimer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>{total} Ar</Text>
        </View>
         <TouchableOpacity
                  style={[styles.checkoutButton, cart.length === 0 && styles.disabledButton]}
                  onPress={handleCheckout}
                  disabled={cart.length === 0}
                >
                  <Text style={styles.checkoutButtonText}>
                    Commander ({itemCount} article{itemCount > 1 ? 's' : ''})
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
 title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  clearText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
   card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    image: {
      width: 70,
      height: 70,
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
    },
    info: {
        flex: 1,
        marginLeft: 12,
      },
      nom: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
      },
      prix: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E3A5F',
        marginTop: 2,
      },
      quantityContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 6,
        },
        qtyButton: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#F3F4F6',
          justifyContent: 'center',
          alignItems: 'center',
        },
        qtyText: {
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          marginHorizontal: 12,
        },
        deleteButton: {
          padding: 8,
        },
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 50,
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          },
          totalLabel: {
            fontSize: 12,
            color: '#6B7280',
          },
          totalPrice: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1E3A5F',
          },
          checkoutButton: {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#1E3A5F',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
            },
            checkoutButtonText: {
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
            },
            disabledButton: {
              backgroundColor: '#9CA3AF',
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
              browseButton: {
                backgroundColor: '#1E3A5F',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 10,
                marginTop: 20,
              },
                browseButtonText: {
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 16,
                },
              });