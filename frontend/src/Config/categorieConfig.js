
export const CATEGORIE_CONFIG = {
  'Hôtel': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'chambre',
      produitPluriel: 'chambres',
      article: 'chambre',
      articlePluriel: 'chambres',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'séjour',
      verbeCommande: 'Réserver',
      stock: 'Chambres disponibles',
      description: 'Détails de la chambre',
      prix: 'Tarif / nuit',
    },
    raisonsAnnulation: [
      'Chambre indisponible à ces dates',
      'Surcharge de réservations',
      'Problème de maintenance',
      'Erreur de tarif',
      'Autre',
    ],
  },

  'Cyber café': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'poste',
      produitPluriel: 'postes',
      article: 'poste',
      articlePluriel: 'postes',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'session',
      verbeCommande: 'Réserver',
      stock: 'Postes disponibles',
      description: 'Détails du poste',
      prix: 'Tarif / heure',
    },
    raisonsAnnulation: [
      'Poste indisponible à cette heure',
      'Surcharge de réservations',
      'Problème technique',
      'Erreur de tarif',
      'Autre',
    ],
  },

  'Location de salle': {
    besoinDuree: true,
    besoinAdresse: false,
    vocabulaire: {
      produit: 'salle',
      produitPluriel: 'salles',
      article: 'salle',
      articlePluriel: 'salles',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'événement',
      verbeCommande: 'Réserver',
      stock: 'Salles disponibles',
      description: "Détails de l'événement",
      prix: 'Tarif / jour',
    },
    raisonsAnnulation: [
      'Salle indisponible à cette date',
      'Surcharge de réservations',
      'Problème de maintenance',
      'Erreur de tarif',
      'Autre',
    ],
  },

  'Location de véhicule': {
    besoinDuree: true,
    besoinAdresse: true,
    vocabulaire: {
      produit: 'véhicule',
      produitPluriel: 'véhicules',
      article: 'véhicule',
      articlePluriel: 'véhicules',
      panier: 'sélection',
      commande: 'réservation',
      commandePluriel: 'réservations',
      livraison: 'location',
      verbeCommande: 'Réserver',
      stock: 'Véhicules disponibles',
      description: 'Détails du véhicule',
      prix: 'Tarif / jour',
    },
    raisonsAnnulation: [
      'Véhicule indisponible à ces dates',
      'Surcharge de réservations',
      'Problème mécanique',
      'Erreur de tarif',
      'Autre',
    ],
  },

  // Catégorie par défaut : Vente, Restaurant, Pharmacie, Pressing, etc.
  default: {
    besoinDuree: false,
    besoinAdresse: true,
    vocabulaire: {
      produit: 'produit',
      produitPluriel: 'produits',
      article: 'article',
      articlePluriel: 'articles',
      panier: 'panier',
      commande: 'commande',
      commandePluriel: 'commandes',
      livraison: 'livraison',
      verbeCommande: 'Commander',
      stock: 'Stock disponible',
      description: 'Description',
      prix: 'Prix',
    },
    raisonsAnnulation: [
      'Rupture de stock',
      'Trop de demandes en cours',
      'Erreur de prix',
      'Erreur de disponibilité',
      'Problème de livraison',
      'Autre',
    ],
  },
};

export const getConfigCategorie = (nomCategorie) => {
  return CATEGORIE_CONFIG[nomCategorie] || CATEGORIE_CONFIG.default;
};