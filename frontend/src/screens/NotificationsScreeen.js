import React, {useState, useEffect} from 'react';
import {
    View,
    Text, 
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext' 
import { supabase } from '../lib/supabase';

export default function NotificationsScreen ({navigation}) {

const {user} = useAuth();
const [notifications, setNotifications] = useState([]);
const [loading, setLoading] = useState(true);

const loadNotifications = async () => {
if (!user) return ;

try{
    const {data, error} = await supabase
    .from('notifications')
    .select('*')
    .eq('utilisateur_id', user.id)
    .order('created_at', {ascending: false});

    if(error) throw error;
    
    setNotifications(data || []);
}catch(error){
console.error('Erreur chargement notifications:', error);
}finally{
    setLoading(false);
}
};

useEffect(() => {
    loadNotifications();
}, []);

const marquerCommeLu = async (id) => {
    try{
        const { error } = await supabase
        .from('notifications')
        .update({ lue : true })
        .eq('id', id);

        if(error) throw error;

        loadNotifications();

    }catch(error){
      console.error('Erreur:', error);
    }
};

const renderItem = ({ item }) => {
const date = new Date(item.created_at);

const dateFormatee = date.toLocaleDateString('fr-FR', {
     day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
});

return(
    <TouchableOpacity
        style={[styles.card, !item.lu && styles.cardNonLu]}
        onPress={() => {
          marquerCommeLu(item.id);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titreContainer}>
            <Text style={styles.date}>{dateFormatee}</Text>
            {!item.lue && <View style={styles.pointRouge} />}
          </View>
        </View>
        <Text style={styles.titre}>{item.titre}</Text>
        <Text style={styles.message}>{item.message}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

   return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>🔔 Notifications</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySub}>
            Vous serez notifié quand le pro change le statut de votre commande.
          </Text>
        </View>
      ) : (
         <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 12 },
  list: { padding: 16, paddingBottom: 40 },
 card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardNonLu: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  pointRouge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
