import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";


export default function AdminCategorie() {
  const [categorie, setCategorie] = useState([]);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const navigation  = useNavigation();

  const loadCategorie = async () => {
    try {
      setLoading(true);
      const{ data, error} = await supabase
      .from('categories')
      .select('*')
      .order('nom');
      if(error) throw error; 
      setCategorie(data);
    } catch (error) {
      console.error('Erreur de chargement de categorie: ', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategorie();
  }, []);

  /** Ajout de categorie */
  const AddCategorie = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'le nom de catégorie est obligatoire');
      return;
    }
    try {
      const {error} = await supabase.from('categories').insert({
        nom: nom.trim(),
        description: description.trim(),
      });
      if (error) throw error; 
      Alert.alert('Succès', 'Catégorie ajoutée !');
      setNom('');
      setDescription('');
      setModalVisible(false);
      loadCategorie();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du catégorie', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la catégorie');
    }
  };

  /** Modifier le catégorie */
  const EditCategorie = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'le champ nom est obligatoire');
      return;
    }
    try {
      const {error} = await supabase 
      .from('categories')
      .update({
        nom: nom.trim(),
        description: description.trim(),
      })
      .eq('id', selectedId)
      
      if(error) throw error

      Alert.alert('Succès', 'Catégorie modifiée !');
      setNom('');
      setDescription('');
      setSelectedId(null);
      setModalVisible(false);
      loadCategorie();
    } catch (error) {
      console.error('Erreur lors de modification', error);
      Alert.alert('Erreur', 'Modification échouée');
    }
  }

  /** Supprimer un categorie */
  const deleteCategorie = (id, nom) => {
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment supprimer "${nom}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const {error} = await supabase
              .from('categories')
              .delete()
              .eq('id', id);
              if(error) throw error;

              Alert.alert('Succès', 'Catégorie supprimée !');
              loadCategorie();
            } catch (error) {
              console.error('Erreur de suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer la catégorie');
            }
          },
        },
      ]
    );
  };

  /** Modal pour ajouter */
  const openAddModal = () => {
    setModalMode('add');
    setNom('');
    setDescription('');
    setModalVisible(true);
    setSelectedId(null);
  }

  const openEditModal = (item) => {
    setModalMode('edit');
    setNom(item.nom || '');
    setDescription(item.description || '');
    setModalVisible(true);
    setSelectedId(item.id);
  };

  // MODIFIE: Rendu d'une ligne avec nouveau design
  const RenderItem = ({ item }) => (
    <View style={styles.card}>
      {/* COLONNE GAUCHE - Infos */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <View style={styles.cardInfo}>
          <Ionicons name="document-text-outline" size={14} color="#6B7280" />
          <Text style={styles.cardSubtitle}>{item.description || 'Aucune description'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Ionicons  size={14} color="#9CA3AF" />
          <Text style={styles.cardId}>ID: {item.id}</Text>
        </View>
      </View>

      {/* COLONNE DROITE - Actions avec couleurs */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionEdit]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil-outline" size={20} color="#1a8d24" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionDelete]}
          onPress={() => deleteCategorie(item.id, item.nom)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size='large' color='#2563EB' />
      </SafeAreaView>
    );
  }

  // MODIFIE: Header avec icône et design cohérent
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
               <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#050505" />
               </TouchableOpacity>
            <Ionicons name="pricetags-outline" size={28} color="#2563EB" />
            <Text style={styles.title}>Gestion des catégories</Text>
          </View>
        </View>
      </View>

      {/* MODIFIE: Bouton Ajouter */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Ajouter une catégorie</Text>
      </TouchableOpacity>

      {/* Liste */}
      <FlatList
        data={categorie}
        keyExtractor={(item) => item.id.toString()}
        renderItem={RenderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune catégorie enregistrée</Text>
          </View>
        }
      />

      {/* Modal ajout et modification */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === 'add' ? 'Ajouter une catégorie' : 'Modifier une catégorie'}
            </Text>
            <Text style={styles.inputLabel}>Nom de la catégorie *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Santé"
              value={nom}
              onChangeText={setNom}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Services de santé et bien-être"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={modalMode === 'add' ? AddCategorie : EditCategorie}
              >
                <Text style={styles.saveButtonText}>
                  {modalMode === 'add' ? 'Ajouter' : 'Modifier'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===== STYLES - MÊME STRUCTURE QUE LES AUTRES PAGES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 40,
  },

  // Bouton Ajouter
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'center',
  },

  // COLONNE GAUCHE - Infos
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardId: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // COLONNE DROITE - Actions avec couleurs
  cardActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEdit: {
    backgroundColor: '#e4f3e4',
  },
  actionDelete: {
    backgroundColor: '#FEF2F2',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    color: '#2c3e50',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2563EB',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});