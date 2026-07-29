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
import db from '../database/database';

export default function AdminVillesScreen() {

  const [villes, setVilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const [nom, setNom] = useState('');
  const [region, setRegion] = useState('');

  const loadVilles = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync('SELECT * FROM villes ORDER BY nom');
      setVilles(result);
    } catch (error) {
      console.error('Erreur chargement de villes: ', error);
      Alert.alert('Erreur', 'Impossible de charger les villes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVilles();
  }, []);

  /** ajout de villes */
  const AddVilles = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'le nom de la ville est obligatoire');
      return;
    }
    try {
      await db.runAsync('INSERT INTO villes (nom, region) VALUES (?,?)',
        [nom.trim(), region.trim()]
      );
      Alert.alert('Succès', 'Ville ajoutée !');
      setNom('');
      setRegion('');
      setModalVisible(false);
      loadVilles();
    } catch (error) {
      console.error('Error ajout', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la ville');
    }
  };

  /** Modifier les villes */
  const EditVille = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'le nom de ville est obligatoire');
      return;
    }
    try {
      await db.runAsync(
        'UPDATE villes SET nom = ? , region = ? WHERE id = ?',
        [nom.trim(), region.trim(), selectedId],
      );
      Alert.alert('Succès', 'Ville modifiée !');
      setNom('');
      setRegion('');
      setSelectedId(null);
      setModalVisible(false);
      loadVilles();
    } catch (error) {
      console.error('Erreur modification', error);
      Alert.alert('Erreur', 'Erreur lors de la modification');
    }
  }

  /** Supprimer les villes */
  const deleteVille = (id, nom) => {
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
              await db.runAsync('DELETE FROM villes WHERE id = ?', [id]);
              Alert.alert('Succès', 'Ville supprimée !');
              loadVilles();
            } catch (error) {
              console.error('Erreur lors de la suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer la ville');
            }
          },
        },
      ]
    );
  };

  /** modal pour ajouter */
  const openAddModal = () => {
    setModalMode('add');
    setNom('');
    setRegion('');
    setModalVisible(true);
    setSelectedId(null);
  };

  /** Modal pour modifier */
  const openEditModal = (item) => {
    setModalMode('edit');
    setNom(item.nom || '');
    setRegion(item.region || '');
    setSelectedId(item.id);
    setModalVisible(true);
  };

  // MODIFIE: Rendu d'une ligne avec nouveau design
  const RenderItem = ({ item }) => (
    <View style={styles.card}>
      {/* COLONNE GAUCHE - Infos */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <View style={styles.cardInfo}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.cardSubtitle}>{item.region || 'Région non définie'}</Text>
        </View>
        <View style={styles.cardInfo}>
          {/* MODIFIE: Hash à la place de ? */}
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
          onPress={() => deleteVille(item.id, item.nom)}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="location-outline" size={28} color="#2563EB" />
            <Text style={styles.title}>Gestion des villes</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{villes.length} villes enregistrées</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Ajouter une ville</Text>
      </TouchableOpacity>

      <FlatList
        data={villes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={RenderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune ville enregistrée</Text>
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
              {modalMode === 'add' ? 'Ajouter une ville' : 'Modifier une ville'}
            </Text>
            <Text style={styles.inputLabel}>Nom de la ville *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Antananarivo"
              value={nom}
              onChangeText={setNom}
            />

            <Text style={styles.inputLabel}>Région</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Analamanga"
              value={region}
              onChangeText={setRegion}
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
                onPress={modalMode === 'add' ? AddVilles : EditVille}
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

// ===== STYLES =====
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
  // MODIFIE: Bouton Modifier en bleu
  actionEdit: {
    backgroundColor: '#e4f3e4',
  },
  // MODIFIE: Bouton Supprimer en rouge
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
});4