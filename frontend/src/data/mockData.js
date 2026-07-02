// src/data/mockData.js

export const categories = [
  { id: 1, nom: 'Hôtels', icone: '🏨', description: 'Hébergements de qualité' },
  { id: 2, nom: 'Restaurants', icone: '🍽️', description: 'Cuisine locale et internationale' },
  { id: 3, nom: 'Cybercafés', icone: '💻', description: 'Accès internet et services informatiques' },
  { id: 4, nom: 'Artisans', icone: '🎨', description: 'Artisanat et créations locales' },
  { id: 5, nom: 'Agriculture', icone: '🌾', description: 'Produits agricoles et fermes' },
];

export const entreprises = [
  {
    id: 1,
    nom: 'Hôtel Fianar',
    categorie: 'Hôtels',
    ville: 'Fianarantsoa',
    adresse: 'Rue du 26 Juin, Fianarantsoa',
    telephone: '034 10 00 01',
    description: 'Hôtel confortable en centre-ville avec vue sur les montagnes. 15 chambres climatisées, restaurant, piscine.',
    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    note: 4.5,
    horaires: 'Ouvert 24h/24',
    siteWeb: 'www.hotelfianar.mg',
  },
  {
    id: 2,
    nom: 'Cyber Fianar',
    categorie: 'Cybercafés',
    ville: 'Fianarantsoa',
    adresse: 'Avenue de l\'Indépendance, Fianarantsoa',
    telephone: '034 10 00 02',
    description: 'Cybercafé moderne avec 10 postes, imprimante, scanner, connexion fibre optique.',
    photo: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=400',
    note: 4.2,
    horaires: '8h - 22h',
    siteWeb: null,
  },
  {
    id: 3,
    nom: 'Restaurant La Varangue',
    categorie: 'Restaurants',
    ville: 'Antananarivo',
    adresse: 'Lot II 123, Ambohitsorohitra, Antananarivo',
    telephone: '034 10 00 03',
    description: 'Cuisine malgache et française. Spécialités : romazava, ravitoto, foie gras.',
    photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    note: 4.8,
    horaires: '11h - 14h, 18h - 22h',
    siteWeb: 'www.lavarangue.mg',
  },
  {
    id: 4,
    nom: 'Atelier d\'Art Tanana',
    categorie: 'Artisans',
    ville: 'Antananarivo',
    adresse: 'Rue Andrianampoinimerina, Antananarivo',
    telephone: '034 10 00 04',
    description: 'Artisanat malgache : sculptures sur bois, bijoux en pierres précieuses, vannerie.',
    photo: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400',
    note: 4.3,
    horaires: '9h - 17h',
    siteWeb: null,
  },
  {
    id: 5,
    nom: 'Ferme Agricole Soa',
    categorie: 'Agriculture',
    ville: 'Fianarantsoa',
    adresse: 'Route Nationale 7, Fianarantsoa',
    telephone: '034 10 00 05',
    description: 'Production de riz, maïs, légumes bio. Vente en gros et détail.',
    photo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
    note: 4.1,
    horaires: '7h - 18h',
    siteWeb: null,
  },
];

export const produits = [
  { id: 1, entrepriseId: 1, nom: 'Chambre Standard', description: 'Chambre confortable avec salle de bain privée', prix: 80000, stock: 10 },
  { id: 2, entrepriseId: 1, nom: 'Chambre Deluxe', description: 'Chambre spacieuse avec vue sur la montagne', prix: 150000, stock: 5 },
  { id: 3, entrepriseId: 3, nom: 'Menu Dégustation', description: '5 plats : entrée, plat, dessert', prix: 35000, stock: 20 },
  { id: 4, entrepriseId: 4, nom: 'Sculpture en bois', description: 'Sculpture en bois de rose, 30cm', prix: 50000, stock: 3 },
];

export const avis = [
  { id: 1, entrepriseId: 1, nomClient: 'Jean', note: 5, commentaire: 'Très bon hôtel, personnel accueillant.', date: '2025-01-15' },
  { id: 2, entrepriseId: 1, nomClient: 'Marie', note: 4, commentaire: 'Bien situé, petit déjeuner copieux.', date: '2025-02-02' },
  { id: 3, entrepriseId: 3, nomClient: 'Pierre', note: 5, commentaire: 'Excellente cuisine malgache !', date: '2025-01-20' },
];