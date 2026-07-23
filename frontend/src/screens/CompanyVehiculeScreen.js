import React , {useState, useEffect} from "react";
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import db from "../database/database";

export default function CompanyVehiculeScreen({route, navigation}){
const {idEntreprise} = route.params;
const [vehicules, setVehicules] = useState([]);
const [loading, setLoading] = useState(true);


useEffect(() => {

const loadVehicules = async () => {
 try{

    const result = await db.getAllAsync(`
    SELECT * FROM vehicules WHERE id_entreprise = ? `, 
    [idEntreprise]);
    setVehicules(result);
 }catch(error){
 console.error('Erreur chargement véhicules', error);
}finally{
    setLoading(false);
}
};
 loadVehicules();
}, []);

if(loading) {
 return(
    <SafeAreaView style={styles.center}>
     <ActivityIndicator size="large" color="#007BFF"/>
    </SafeAreaView>
 );
}

return(
    <SafeAreaView style={styles.container}>
     <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
       <Text style={styles.title}>🚐 Véhicules</Text>
     </View>
     <FlatList
      data={vehicules}
      keyExtractor={(item) => item.id_vehicule.toString()}
      renderItem={({ item }) => (
      <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Places', {idVehicule: item.id_vehicule})}
      >
     <Text style={styles.vehiculeNom}>{item.nom}</Text>
            <Text style={styles.vehiculeInfo}>Date de départ et heure: {item.date_depart} à {item.heure_depart}</Text>
            <Text style={styles.vehiculeInfo}>Prix : {item.prix_place} Ar / place</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Place disponible : {item.capacite} places</Text>
            </View>

      </TouchableOpacity>
      )}
       ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun véhicule disponible</Text>
          </View>
        }
     />
    </SafeAreaView>
);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginLeft: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 15, marginVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  vehiculeNom: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  vehiculeInfo: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
  badge: { backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  badgeText: { color: '#2e7d32', fontSize: 12, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#95a5a6' },
});