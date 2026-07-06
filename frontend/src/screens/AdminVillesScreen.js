import React, {useState, useEffect} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaViewBase,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import db from '../database/database';

export default function AdminVillesScreen(){

const [villes, setVilles] = useState([]);
const [loading, setLoading] = useState(true);
const [modalVisible, setModalVisible] = useState(false);
const [modalMode, setModalMode] = useState('add');
const [selectedId, setSelectedId] = useState(null);
const [nom, setNom] = useState('');
const[region, setRegion] = useState('');


const loadVilles = async () => {
    try{
     setLoading(true);
     const result = await db.getAllAsync('SELECT * FROM villes ORDER BY nom ');
     setVilles(result);
    }catch(error){
       console.error('Erreur chargement de villes: ', error);
       Alert.alert('Erreur, Impossible de charger les villes');
    }finally{
        setLoading(false);
    }
};

useEffect(() => {
    loadVilles();
}, []);

/** ajout de villes */

const AddVilles = async () => {
  if(!nom.trim()){
    Alert.alert('Erreur','le nom de la ville est obligatoire');
    return;
  }
  try{
  await db.runAsync('INSERT INTO villes (nom, region) VALUES (?,?)',
  [nom.trim(), region.trim()]
  );
  Alert.alert('Succès', 'Villes ajoutée!');
  setNom('');
  setRegion('');
  setModalVisible(false);
  loadVilles();
  }catch(error){
    console.error('Error ajout', erreur)
    Alert.alert('Erreur', 'Impossible d\'ajouter la ville ');
  }
};

/** Modifier les villes */

const EditVille = async () => {
 if(!nom.trim()){
 Alert.alert('Erreur', 'le nom de ville est obligatoire');
 return;
 }
 try{
 await db.runAsync(
    'UPDATE villes SET nom = ? , region = ?  WHERE id = ?',
    [nom.trim(), region.trim(), selectedId],
 );
  Alert.alert('Succès', 'Villes Modifié');
  setNom('');
  setRegion('');
  setSelectedId(null);
  setModalVisible(false);
  loadVilles();
 }catch(error){
 console.error('Erreur modification', error);
 Alert.alert('Erreur', 'Erreur lors de la modification');
 };
}

/** Supprimer les villes */

 const deleteVille = (id , nom ) => {
    Alert.alert('Confirmation',
        `Voulez vous supprimer vraiment "${nom}"?`,
        [
        {text: 'Annuler', style: 'cancel'},
        {
            text:'supprimer',
            style:'destructive',
            onPress: async () =>{
             try{
               await db.runAsync('DELETE FROM villes WHERE id = ?', [id]);
               Alert.alert('Succès', 'Villes supprimé !');
               loadVilles();
             }catch(error){
              console.error('Erreur lors de la suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer la ville');
             }
         },
        },
        ]
    );

 };

 /**  modal pour ajouter */
const openAddModal = () => {
 setModalMode('add');
 setNom('');
 setRegion('');
 setModalVisible(true);
 setSelectedId(null);
 loadVilles();
};

/** Modal pour modifier */

const openEditModal = (item) => {
    setModalMode('edit');
    setNom(item.nom);
    setRegion(item.region || '');
    setSelectedId(item.id);
    setModalVisible(true);
};

/** affichage ligne* */

const RenderItem = ({item}) => (
 <View style={styles.card}>
  <View style={styles.cardContent}>
    <Text style={styles.cardTitle}>Nom: {item.nom}</Text>
    <Text style={styles.cardSubtitle}>Region: {item.region || 'region non definie '}</Text>
    <Text style={styles.cardId}>ID: {item.id}</Text>
  </View>

  <View style={styles.cardActions}> 
    <TouchableOpacity
     style={[styles.actionButton, styles.editButton]}
     onPress={() => openEditModal(item)}
    >
    <Ionicons name='pencil' size={18} color='#fff'/>
    </TouchableOpacity>

    <TouchableOpacity
     style={[styles.actionButton, styles.deleteButton]}
     onPress={() => deleteVille(item.id, item.nom)}
    >
     <Ionicons name='trash' size={18} color='#fff'/>
    </TouchableOpacity>

  </View>
 </View>

);

if(loading) {
    return(
        <SafeAreaView style={styles.center}>
            <ActivityIndicator size='large' color='#007BFF' />
        </SafeAreaView>
    );
}

return(
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
         <Text style={styles.title}>Gestion des villes </Text>
         <Text style={styles.subtitle}>{villes.length} villes enregistrée</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name='add-circle' size={24} color='#fdf3f3' />
            <Text style={styles.addButtonText}>Ajouter une ville </Text>
        </TouchableOpacity>

        {/** liste */}
      <FlatList
       data={villes}
       keyExtractor={(item) => item.id.toString()}
       renderItem={RenderItem}
       contentContainerStyle={styles.list}
       ListEmptyComponent={
        <View style={styles.empty}>
            <Ionicons name='location-outline' size={50} color='#ccc'/>
            <Text style={styles.emptyText}>Aucune ville enregistrée</Text>
        </View>
       }
      />
     {/** Modal ajout et modification */}
     
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
       <Text style={styles.inputLabel}>Nom de la Ville *</Text>
       <TextInput style={styles.input} placeholder="Ex: Antananarivo" value={nom} onChangeText={setNom} />
     
       <Text style={styles.inputLabel}>Nom de la région *</Text>
       <TextInput style={styles.input} placeholder="Ex: analamanga" value={region} onChangeText={setRegion} />

     <View style={styles.modalButtons}>
        <TouchableOpacity
        style={[styles.modalButtons, styles.cancelButton]}
        onPress={() => setModalVisible(false)}
        >
       <Text style={styles.cancelButtonText}>Annuler</Text>
       </TouchableOpacity>
      <TouchableOpacity
       style={[styles.modalButtons, styles.saveButton]}
      onPress={modalMode === 'add' ? AddVilles : EditVille}
      >
       <Text style={styles.saveButtonText}>
        {modalMode === 'add' ? 'ajouter' : 'modifier'}
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
  container: {
    flex: 1 ,
    backgroundColor:'#f5f5f5' ,
  },
   header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007BFF',
    margin: 15,
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
 cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  cardId: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
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
    color: '#2c3e50',
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
    backgroundColor: '#007BFF',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    
  },
})