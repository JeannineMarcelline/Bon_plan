import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {supabase} from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import {getConfigCategorie} from '../../../Config/categorieConfig';

export default function IndisponibiliteScreen(){
const { user } = useAuth();
const navigation = useNavigation();

const [entreprise, setEntreprise] = useState(null);
const [produits, setProduits] = useState([]);
const[indispos, setIndispos] = useState([]);
const [loading , setLoading] = useState(true);
const [modalVisible, setModalVisible] = useState(false);
const [produitSelectionne, setProduitSelectionne] = useState(null);
const [dateDebut, setDateDebut] = useState(null);
const [dateFin, setDateFin] = useState(null);
const [raison, setRaison] = useState('');

const [showPickerDebut, setShowPickerDebut] = useState(false);
const [showPickerFin, setShowPickerFin] = useState(false);
const [saving, setSaving] = useState(false);

const config = getConfigCategorie(entreprise?.categorie || null);
const mots = config.vocabulaire;

const loadData = useCallback(async () => {

if(!user) return;
 try{
    setLoading(true);

    const {data: entrepriseData} = await supabase
    .from('entreprises')
    .select('id, nom, categories(nom)')
    .eq('utilisateur_id', user.id)
    .maybeSingle();

    if(!entrepriseData){
        setLoading(false);
        return;
    }

    const e = {
        ...entrepriseData,
        categories: entrepriseData.categories?.nom || null,
    }
      setEntreprise(e);

  const { data: produitData} = await supabase.from('produits').select('id, nom_produit').eq('id_entreprise', e.id).eq('actif', true).order('nom_produit');

  setProduits(produitData || []);

  const { data : indisposData } = await supabase
  .from('indisponibilites')
  .select('*')
  .eq('id_entreprise', e.id)
  .order('date_debut', {ascending  : false });

  setIndispos(indisposData || []);

 }catch(error){

   console.error('Erreur de chargement', error);
   Alert.alert('Erreur', 'Impossible de charger les données');
 }finally{
    setLoading(false);
 }
}, [user]);

useEffect(() => {
    loadData();
}, [loadData]);

const ouvrirModal = () => {
setProduitSelectionne(null);
setDateDebut(null);
setDateFin(null);
setRaison('');
setModalVisible(true);
};

const fermerModal = () => {
 setModalVisible(false);

};

 const onChangeDateDebut = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPickerDebut(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDateDebut(selectedDate);
      if (dateFin && dateFin < selectedDate) setDateFin(null);
    }
  };

  const onChangeDateFin = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPickerFin(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) setDateFin(selectedDate);
  };

  const handlSave = async () => {
    if(!dateDebut || !dateFin) {
        Alert.alert('Dates manquantes', 'Veuillez choisir une date de début et de fin');
        return;
    }
    if (dateFin <= dateDebut) {
      Alert.alert('Dates incohérentes', 'La date de fin doit être après la date de début.');
      return;
  }

  setSaving(true);

try{
     const { error } = await supabase.from('indisponibilites').insert({
        id_entreprise: entreprise.id,
        id_produit: produitSelectionne?.id || null,
        date_debut: dateDebut.toISOString(),
        date_fin: dateFin.toISOString(),
        raison: raison.trim() || null,
      });

      if (error) throw error;

      Alert.alert('Succès', 'Blocage ajouté.');
      fermerModal();
      await loadData();

}catch(error){
 console.error('Erreur ajout blocage:', error);
 Alert.alert('Erreur', "Impossible d'ajouter le blocage.");

}finally{
    setSaving(false);
}
};

const handleDelete = (id) => {

    Alert.alert(
        'Supprimer le blocage',
        'Cette action est définitive',
    [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try{
               const { error } = await supabase
                .from('indisponibilites')
                .delete()
                .eq('id', id);
              if (error) throw error;
              await loadData();
            }catch(error){
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer.');
            }
          },
        },
    ]
    );

};

  const formatDateFr = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getNomProduit = (id_produit) => {
    if (!id_produit) return 'Tout l\'établissement';
    const p = produits.find((x) => x.id === id_produit);
    return p?.nom_produit || 'Produit supprimé';
  };

  //affichage

   if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!entreprise) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>Aucune entreprise trouvée</Text>
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes indisponibilités</Text>
        <TouchableOpacity onPress={ouvrirModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            Bloquez les dates où vous n'êtes pas disponible. Les clients ne
            pourront pas réserver sur ces périodes.
          </Text>
        </View>

        {/* Liste des blocages */}
        {indispos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucune indisponibilité</Text>
            <Text style={styles.emptySub}>
              Appuyez sur + pour ajouter une période de fermeture.
            </Text>
          </View>
        ) : (
          indispos.map((indispo) => (
            <View key={indispo.id} style={styles.indispoCard}>
              <View style={styles.indispoHeader}>
                <View style={styles.indispoIcon}>
                  <Ionicons
                    name={indispo.id_produit ? 'bed-outline' : 'business-outline'}
                    size={18}
                    color="#DC2626"
                  />
                </View>
                <Text style={styles.indispoTitre}>
                  {getNomProduit(indispo.id_produit)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(indispo.id)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>

              <View style={styles.indispoRow}>
                <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                <Text style={styles.indispoText}>
                  Du {formatDateFr(indispo.date_debut)} au {formatDateFr(indispo.date_fin)}
                </Text>
              </View>

              {indispo.raison ? (
                <View style={styles.indispoRow}>
                  <Ionicons name="document-text-outline" size={15} color="#6B7280" />
                  <Text style={styles.indispoText}>{indispo.raison}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* MODALE D'AJOUT */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={fermerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau blocage</Text>
              <TouchableOpacity onPress={fermerModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Choix du produit */}
              <Text style={styles.label}>Que bloquez-vous ?</Text>

              <TouchableOpacity
                style={[
                  styles.produitOption,
                  produitSelectionne === null && styles.produitOptionSelected,
                ]}
                onPress={() => setProduitSelectionne(null)}
              >
                <Ionicons
                  name={produitSelectionne === null ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={produitSelectionne === null ? '#2563EB' : '#9CA3AF'}
                />
                <Text style={styles.produitOptionText}>
                  Tout l'établissement
                </Text>
              </TouchableOpacity>

              {produits.map((p) => {
                const selected = produitSelectionne?.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.produitOption, selected && styles.produitOptionSelected]}
                    onPress={() => setProduitSelectionne(p)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? '#2563EB' : '#9CA3AF'}
                    />
                    <Text style={styles.produitOptionText}>{p.nom_produit}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Dates */}
              <Text style={[styles.label, { marginTop: 16 }]}>Période</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPickerDebut(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {dateDebut ? formatDateFr(dateDebut) : 'Date de début'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  if (!dateDebut) {
                    Alert.alert('Choisissez le début', 'Sélectionnez d\'abord la date de début.');
                    return;
                  }
                  setShowPickerFin(true);
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {dateFin ? formatDateFr(dateFin) : 'Date de fin'}
                </Text>
              </TouchableOpacity>

              {showPickerDebut && (
                <DateTimePicker
                  value={dateDebut || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onChangeDateDebut}
                />
              )}

              {showPickerFin && (
                <DateTimePicker
                  value={dateFin || dateDebut || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={dateDebut || new Date()}
                  onChange={onChangeDateFin}
                />
              )}

              {/* Raison (optionnelle) */}
              <Text style={[styles.label, { marginTop: 16 }]}>Raison (optionnel)</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.raisonRow}
              >
                {['Travaux', 'Vacances', 'Maintenance', 'Indisponible'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.raisonChip, raison === r && styles.raisonChipSelected]}
                    onPress={() => setRaison(raison === r ? '' : r)}
                  >
                    <Text
                      style={[
                        styles.raisonChipText,
                        raison === r && styles.raisonChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            {/* Boutons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={fermerModal}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, saving && { opacity: 0.6 }]}
                onPress={handlSave}
                disabled={saving}
              >
                <Text style={styles.modalBtnSaveText}>
                  {saving ? 'Ajout...' : 'Bloquer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  ); 
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 12 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { padding: 16, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  indispoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  indispoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  indispoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indispoTitre: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  deleteBtn: { padding: 4 },
  indispoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  indispoText: { flex: 1, fontSize: 13, color: '#4B5563' },

  // Modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  produitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 6,
  },
  produitOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  produitOptionText: { fontSize: 14, color: '#111827' },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dateButtonText: { fontSize: 14, color: '#111827' },

  raisonRow: { flexDirection: 'row', marginBottom: 4 },
  raisonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  raisonChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  raisonChipText: { fontSize: 13, color: '#6B7280' },
  raisonChipTextSelected: { color: '#2563EB', fontWeight: '600' },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  modalBtnSave: { backgroundColor: '#2563EB' },
  modalBtnSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
