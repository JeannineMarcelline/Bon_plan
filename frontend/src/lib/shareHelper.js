import { Share, Alert } from 'react-native';



const estEnPromoActive = (produit) => {
  if (produit.prix_promo == null) return false;
  if (!produit.date_debut_promo || !produit.date_fin_promo) return false;

  const maintenant = new Date();
  const debut = new Date(produit.date_debut_promo);
  const fin = new Date(produit.date_fin_promo);

  return debut <= maintenant && fin >= maintenant;
};


export const partagerNatif = async (message, titre = 'Partager') => {
  try {
    const result = await Share.share({
      message,
      title: titre,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Erreur partage:', error);
    Alert.alert('Erreur', 'Impossible de partager.');
    return false;
  }
};


const blocEntreprise = (entreprise) => {
  let msg = '';
  if (entreprise.adresse) msg += `Adresse : ${entreprise.adresse}\n`;
  if (entreprise.telephone) msg += `Telephone : ${entreprise.telephone}\n`;
  if (entreprise.ville) msg += `Ville : ${entreprise.ville}\n`;
  return msg;
};

// ⭐ Message pour une entreprise
export const messageEntreprise = (entreprise, noteMoyenne = 0) => {
  let msg = '';
  msg += `BON PLAN MADAGASCAR\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${entreprise.nom.toUpperCase()}\n`;
  if (entreprise.categorie) msg += `${entreprise.categorie}\n`;
  msg += `\n`;

  msg += blocEntreprise(entreprise);

  if (noteMoyenne > 0) {
    msg += `Note : ${noteMoyenne.toFixed(1)}/5\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Decouvrez cette adresse sur Bon Plan Madagascar`;
  return msg;
};


export const messageProduit = (produit, entreprise) => {
   const enPromo = estEnPromoActive(produit);

  let msg = '';
  msg += `BON PLAN MADAGASCAR\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${produit.nom_produit.toUpperCase()}\n`;
  if (entreprise?.nom) msg += `Chez ${entreprise.nom}\n`;
  msg += `\n`;

  if (enPromo) {
    const reduction = Math.round(
      (1 - produit.prix_promo / produit.prix_produit) * 100
    );
    msg += `PROMOTION -${reduction}%\n\n`;
    msg += `Prix promo : ${Number(produit.prix_promo).toLocaleString('fr-FR')} Ar\n`;
    msg += `Prix normal : ${Number(produit.prix_produit).toLocaleString('fr-FR')} Ar\n`;
  } else {
    msg += `Prix : ${Number(produit.prix_produit).toLocaleString('fr-FR')} Ar\n`;
  }

  if (produit.description_pro) {
    msg += `\n${produit.description_pro}\n`;
  }

  // ⭐ Infos entreprise
  if (entreprise) {
    msg += `\n`;
    msg += blocEntreprise(entreprise);
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Decouvrez cette offre sur Bon Plan Madagascar`;
  return msg;
};

// ⭐ Message pour un bon plan (HomeScreen)
export const messageBonPlan = (promo) => {

   if (!estEnPromoActive(promo)) {
    return messageProduit(promo, promo.entreprises);
  }

  const reduction = Math.round(
    (1 - promo.prix_promo / promo.prix_produit) * 100
  );

  let msg = '';
  msg += `BON PLAN A NE PAS MANQUER\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${promo.nom_produit.toUpperCase()}\n`;
  if (promo.entreprises?.nom) msg += `Chez ${promo.entreprises.nom}\n`;
  msg += `\n`;
  msg += `PROMOTION -${reduction}%\n\n`;
  msg += `Prix promo : ${Number(promo.prix_promo).toLocaleString('fr-FR')} Ar\n`;
  msg += `Prix normal : ${Number(promo.prix_produit).toLocaleString('fr-FR')} Ar\n`;

  if (promo.date_fin_promo) {
    const dateFin = new Date(promo.date_fin_promo).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
    });
    msg += `\nOffre valable jusqu'au ${dateFin}\n`;
  }

  // ⭐ Infos entreprise (depuis promo.entreprises)
  if (promo.entreprises) {
    msg += `\n`;
    msg += blocEntreprise(promo.entreprises);
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Retrouvez ce bon plan sur Bon Plan Madagascar`;
  return msg;
};