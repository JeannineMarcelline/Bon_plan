export const CATEGORIE_CONFIG = {
  'Hôtel': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'chambre',
      produitPluriel: 'chambres',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'séjour',
      verbeCommande: 'Réserver',
    },
  },

  'Cyber café': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'poste',
      produitPluriel: 'postes',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'session',
      verbeCommande: 'Réserver',
    },
  },

  'Location de salle': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'salle',
      produitPluriel: 'salles',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'événement',
      verbeCommande: 'Réserver',
    },
  },

  'Location de véhicule': {
    besoinDuree: true,
    besoinAdresse: true, // on peut vouloir se faire livrer le véhicule
    vocabulaire: {
      produit: 'véhicule',
      produitPluriel: 'véhicules',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'location',
      verbeCommande: 'Réserver',
    },
  },


  default: {
    besoinDuree: false,
    besoinAdresse: true,
    vocabulaire: {
      produit: 'produit',
      produitPluriel: 'produits',
      panier: 'panier',
      commande: 'commande',
      commandePluriel: 'commandes',
      livraison: 'livraison',
      verbeCommande: 'Commander',
    },
  },
};


export const getConfigCategorie = (nomCategorie) => {
  return CATEGORIE_CONFIG[nomCategorie] || CATEGORIE_CONFIG.default;
};