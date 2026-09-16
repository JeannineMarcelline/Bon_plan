import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('utilisateur_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // ---------- Marquer UNE comme lue ----------
  const marquerCommeLu = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lue: true } : n))
      );
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
    }
  };

  // ---------- Supprimer UNE notification ----------
  const supprimerUne = (id) => {
    Alert.alert(
      'Supprimer cette notification ?',
      'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id)
                .eq('utilisateur_id', user.id);

              if (error) throw error;

              setNotifications((prev) => prev.filter((n) => n.id !== id));
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cette notification.');
            }
          },
        },
      ]
    );
  };

  // ---------- Tout marquer comme lu ----------
  const toutMarquerCommeLu = async () => {
    const nonLues = notifications.filter((n) => !n.lue);
    if (nonLues.length === 0) return;

    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('utilisateur_id', user.id)
        .eq('lue', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch (error) {
      console.error('Erreur tout marquer comme lu:', error);
      Alert.alert('Erreur', 'Impossible de marquer comme lues.');
    } finally {
      setMarkingAll(false);
    }
  };

  // ---------- Tout effacer ----------
  const toutEffacer = () => {
    if (notifications.length === 0) return;

    Alert.alert(
      'Tout effacer ?',
      `Supprimer les ${notifications.length} notification(s) ? Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('utilisateur_id', user.id);

              if (error) throw error;

              setNotifications([]);
            } catch (error) {
              console.error('Erreur tout effacer:', error);
              Alert.alert('Erreur', 'Impossible de tout effacer.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ---------- Rendu d'une carte ----------
  const renderItem = ({ item }) => {
    const date = new Date(item.created_at);
    const dateFormatee = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[styles.card, !item.lue && styles.cardNonLu]}
        onPress={() => {
          if (!item.lue) marquerCommeLu(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titreContainer}>
            <Text style={styles.date}>{dateFormatee}</Text>
            {!item.lue && <View style={styles.pointRouge} />}
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => supprimerUne(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
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

  const aDesNonLues = notifications.some((n) => !n.lue);
  const aDesNotifs = notifications.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>🔔 Notifications</Text>

        {/* Menu ⋮ — visible s'il y a au moins une action possible */}
        {(aDesNonLues || aDesNotifs) && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        )}
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

      {/* MODALE MENU ⋮ */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            {aDesNonLues && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  toutMarquerCommeLu();
                }}
                disabled={markingAll}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons
                    name="checkmark-done-outline"
                    size={20}
                    color="#2563EB"
                  />
                )}
                <Text style={styles.menuItemText}>Tout marquer comme lu</Text>
              </TouchableOpacity>
            )}

            {aDesNotifs && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  toutEffacer();
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-bin-outline" size={20} color="#DC2626" />
                )}
                <Text style={[styles.menuItemText, { color: '#DC2626' }]}>
                  Tout effacer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backButton: { padding: 4 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 4,
    flex: 1,
  },
  menuBtn: { padding: 4 },

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
  deleteBtn: { padding: 4 },
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
  message: { fontSize: 14, color: '#6B7280' },
  date: { fontSize: 11, color: '#9CA3AF' },

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

  // Menu ⋮
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    minWidth: 230,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});