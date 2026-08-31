// context/CartContext.js
import { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idEntreprise, setIdEntreprise] = useState(null);
  const [idPanier, setIdPanier] = useState(null);

  // ═════════════════════════════════════════════════════════
  // 1. CHARGER LE PANIER DEPUIS SUPABASE
  // ═════════════════════════════════════════════════════════

  const loadCart = async () => {
    if (!user) {
      setCart([]);
      setIdEntreprise(null);
      setIdPanier(null);
      return;
    }

    setLoading(true);
    try {
      // 1. Récupérer l'ID de l'utilisateur (c'est un UUID)
      const userId = user.id;

      // 2. Récupérer le panier du client
      const { data: panierData, error: panierError } = await supabase
        .from('panier')
        .select('id_panier, id_entreprise')
        .eq('id_client', userId)
        .maybeSingle();

      if (panierError) throw panierError;

      if (!panierData) {
        // Pas de panier existant
        setCart([]);
        setIdEntreprise(null);
        setIdPanier(null);
        setLoading(false);
        return;
      }

      // 3. Récupérer les lignes du panier avec les détails des produits
      const { data: lignesData, error: lignesError } = await supabase
        .from('ligne_panier')
        .select(`
          id_lignepan,
          quantite,
          produits (
            id,
            nom_produit,
            description_pro,
            prix_produit,
            stock,
            photos_produit,
            id_entreprise
          )
        `)
        .eq('id_panier', panierData.id_panier);

      if (lignesError) throw lignesError;

      // 4. Transformer les données pour le format du contexte
      const cartItems = lignesData.map((ligne) => ({
        ...ligne.produits,
        quantite: ligne.quantite,
        id_lignepan: ligne.id_lignepan,
      }));

      setCart(cartItems);
      setIdEntreprise(panierData.id_entreprise);
      setIdPanier(panierData.id_panier);

    } catch (error) {
      console.error('Erreur chargement panier:', error);
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // 2. AJOUTER UN PRODUIT AU PANIER
  // ═════════════════════════════════════════════════════════

  const addToCart = async (produit, quantite = 1) => {
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter au panier');
      return;
    }

    // Vérifier si le produit est de la même entreprise que le panier actuel
    if (idEntreprise && idEntreprise !== produit.id_entreprise) {
      Alert.alert(
        '⚠️ Attention',
        `Vous avez déjà des produits d'une autre entreprise dans votre panier. Voulez-vous vider le panier et ajouter ce produit ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Vider et ajouter', onPress: () => clearCartAndAdd(produit, quantite) }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const userId = user.id;

      // 1. Récupérer ou créer le panier
      let panierId = idPanier;

      if (!panierId) {
        // Créer un nouveau panier
        const { data: newPanier, error: createError } = await supabase
          .from('panier')
          .insert({
            id_client: userId,
            id_entreprise: produit.id_entreprise,
          })
          .select('id_panier')
          .single();

        if (createError) throw createError;
        panierId = newPanier.id_panier;
        setIdPanier(panierId);
        setIdEntreprise(produit.id_entreprise);
      }

      // 2. Vérifier si le produit est déjà dans le panier
      const { data: existing, error: existingError } = await supabase
        .from('ligne_panier')
        .select('id_lignepan, quantite')
        .eq('id_panier', panierId)
        .eq('id_produit', produit.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        // Mettre à jour la quantité
        const nouvelleQuantite = existing.quantite + quantite;
        const { error: updateError } = await supabase
          .from('ligne_panier')
          .update({ quantite: nouvelleQuantite })
          .eq('id_lignepan', existing.id_lignepan);

        if (updateError) throw updateError;

        Alert.alert(' Succès', `${produit.nom_produit} quantité mise à jour`);
      } else {
        // Ajouter le produit
        const { error: insertError } = await supabase
          .from('ligne_panier')
          .insert({
            id_panier: panierId,
            id_produit: produit.id,
            quantite: quantite,
          });

        if (insertError) throw insertError;

        Alert.alert(' Succès', `${produit.nom_produit} ajouté au panier`);
      }

      // Recharger le panier
      await loadCart();

    } catch (error) {
      console.error('Erreur ajout panier:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // 3. RETIRER UN PRODUIT DU PANIER
  // ═════════════════════════════════════════════════════════

  const removeFromCart = async (produitId) => {
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour modifier le panier');
      return;
    }

    if (!idPanier) return;

    setLoading(true);
    try {
      // Supprimer la ligne du panier
      const { error: deleteError } = await supabase
        .from('ligne_panier')
        .delete()
        .eq('id_panier', idPanier)
        .eq('id_produit', produitId);

      if (deleteError) throw deleteError;

      // Recharger le panier
      await loadCart();

    } catch (error) {
      console.error('Erreur suppression:', error);
      Alert.alert('Erreur', 'Impossible de retirer le produit');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // 4. METTRE À JOUR LA QUANTITÉ
  // ═════════════════════════════════════════════════════════

  const updateQuantity = async (produitId, nouvelleQuantite, stock) => {
    if (nouvelleQuantite > stock) {
      Alert.alert('Stock insuffisant', `Stock disponible : ${stock} unités`);
      return;
    }

    if (nouvelleQuantite <= 0) {
      await removeFromCart(produitId);
      return;
    }

    if (!user || !idPanier) return;

    setLoading(true);
    try {
      // Mettre à jour la quantité
      const { error: updateError } = await supabase
        .from('ligne_panier')
        .update({ quantite: nouvelleQuantite })
        .eq('id_panier', idPanier)
        .eq('id_produit', produitId);

      if (updateError) throw updateError;

      // Mettre à jour localement (plus rapide)
      setCart(prev =>
        prev.map(item =>
          item.id === produitId
            ? { ...item, quantite: nouvelleQuantite }
            : item
        )
      );

    } catch (error) {
      console.error('Erreur mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la quantité');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // 5. VIDER LE PANIER
  // ═════════════════════════════════════════════════════════

  const clearCart = async () => {
    if (!user || !idPanier) {
      setCart([]);
      setIdEntreprise(null);
      setIdPanier(null);
      return;
    }

    setLoading(true);
    try {
      // Supprimer toutes les lignes du panier
      const { error: deleteError } = await supabase
        .from('ligne_panier')
        .delete()
        .eq('id_panier', idPanier);

      if (deleteError) throw deleteError;

      // Le panier reste mais vide
      setCart([]);

    } catch (error) {
      console.error('Erreur vidage panier:', error);
      Alert.alert('Erreur', 'Impossible de vider le panier');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // 6. VIDER LE PANIER ET AJOUTER (changement entreprise)
  // ═════════════════════════════════════════════════════════

  const clearCartAndAdd = async (produit, quantite) => {
    await clearCart();
    await addToCart(produit, quantite);
  };

  // ═════════════════════════════════════════════════════════
  // 7. CALCULS
  // ═════════════════════════════════════════════════════════

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.prix_produit * item.quantite, 0);
  };

  const getItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantite, 0);
  };

  // ═════════════════════════════════════════════════════════
  // 8. CHARGEMENT INITIAL (quand user change ou au montage)
  // ═════════════════════════════════════════════════════════

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart([]);
      setIdEntreprise(null);
      setIdPanier(null);
    }
  }, [user]);

  // ═════════════════════════════════════════════════════════
  // 9. VALUE DU CONTEXT
  // ═════════════════════════════════════════════════════════

  const value = {
    cart,
    loading,
    idEntreprise,
    idPanier,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    refreshCart: loadCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};