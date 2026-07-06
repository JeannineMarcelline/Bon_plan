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

export default function AdminCategorie () {
    const [categorie, setCategorie] = useState([]);
    const [nom, setNom] = useState('');
    const [description, setDescription] = useState('');
    const [icone, setIcone] = useState('');
    const [loading , setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedId, setSelectedId] = useState(null);

    const loadCategorie = async () =>{
     try{
       setLoading(true);
       const result = await db.getAllAsync('SELECT * FROM categories ORDER BY nom');
       setCategorie(result);
     }catch(error){
      console.error('Erreur de chargement de categorie: ', error);
      Alert.alert('Erreur', 'Impossible de charger les villes');
     }finally{
        setLoading(false);
     }
    };

    useEffect(() => {
        loadCategorie();
    }, []);

   /** Ajout de categorie */

   const AddCategorie = async () =>{
   if(!nom.trim()){
    Alert.alert('Erreur', 'le nom de categorie est obligatoire');
    return;
   }
   try{
   await db.runAsync('INSERT INTO categorie (nom, description, icone) VALUES (?,?,?)');
   [nom.trim(), description.trim(), icone.trim()]
   }catch(error){

   }



   }




}