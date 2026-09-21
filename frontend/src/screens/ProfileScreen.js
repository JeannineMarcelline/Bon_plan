// screens/ProfileScreen.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [entreprise, setEntreprise] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(true);

  // Toggles visuels (à brancher plus tard sur la vraie logique)
  const [notifActive, setNotifActive] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Raccourcis de rôle pour lisibilité
  const isPro = user?.role === 'pro';
  const isAdmin = user?.role === 'admin';
  const isClient = !isPro && !isAdmin;

  // ============================================================
  // CHARGEMENT ENTREPRISE (pro)
  // ============================================================
  const loadEntreprise = async () => {
    if (!isPro) {
      setLoadingEntreprise(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('utilisateur_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setEntreprise(data);
    } catch (error) {
      console.error('Erreur de chargement de entreprise:', error);
    } finally {
      setLoadingEntreprise(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEntreprise();
    }, [])
  );

  // ============================================================
  // DÉCONNEXION
  // ============================================================
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            EN-TÊTE (commun à tous les rôles)
            ============================================================ */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nom?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.avatarEditBadge}
              onPress={() =>
                Alert.alert(
                  'Changer la photo',
                  'Cette fonctionnalité arrive bientôt.'
                )
              }
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.nom || 'Utilisateur'}</Text>

          <View style={styles.userContact}>
            <Text style={styles.userContactText}>
              {user?.email || 'Email non défini'}
            </Text>
            <Text style={styles.userContactSeparator}>|</Text>
            <Text style={styles.userContactText}>
              {user?.telephone || 'Téléphone non défini'}
            </Text>
          </View>
        </View>

        {/* ============================================================
            SECTION "MON ESPACE" — visible pour client et pro
            ============================================================ */}
        {(isClient || isPro) && (
          <>
            <Text style={styles.sectionTitle}>Mon espace</Text>

            <View style={styles.menu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() =>
                  navigation.navigate('Accueil', { screen: 'ClientOrders' })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}
                >
                  <Ionicons name="cube-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.menuItemText}>Mes commandes</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() =>
                  navigation.navigate('Accueil', { screen: 'MesReservations' })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[styles.menuItemIcon, { backgroundColor: '#F5F3FF' }]}
                >
                  <Ionicons name="bus-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.menuItemText}>Mes réservations</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => navigation.navigate('Favoris')}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.menuItemIcon, { backgroundColor: '#FEF2F2' }]}
                >
                  <Ionicons name="heart-outline" size={18} color="#DC2626" />
                </View>
                <Text style={styles.menuItemText}>Mes favoris</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ============================================================
            SECTION "MON ENTREPRISE" — visible uniquement pour les pros
            ============================================================ */}
        {isPro && (
          <>
            <Text style={styles.sectionTitle}>Mon entreprise</Text>

            {loadingEntreprise ? (
              <View style={styles.menu}>
                <View style={styles.menuItem}>
                  <View
                    style={[styles.menuItemIcon, { backgroundColor: '#F3F4F6' }]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color="#4B5563"
                    />
                  </View>
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              </View>
            ) : entreprise ? (
              <View style={styles.entrepriseCard}>
                {/* En-tête de la carte entreprise */}
                <View style={styles.entrepriseHeader}>
                  <View style={styles.entrepriseIconWrapper}>
                    <Ionicons
                      name="business"
                      size={22}
                      color="#1E3A5F"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entrepriseNom}>{entreprise.nom}</Text>
                    <Text style={styles.entrepriseStatutLabel}>
                      {entreprise.statutvalidation === 'valide'
                        ? 'Validée'
                        : entreprise.statutvalidation === 'refuse'
                        ? 'Refusée'
                        : 'En attente de validation'}
                    </Text>
                  </View>
                </View>

                {/* Actions selon statut */}
    {entreprise.statutvalidation === 'valide' && (
  <TouchableOpacity
    style={styles.entrepriseAction}
    onPress={() =>
      navigation.navigate('Accueil', {
        screen: 'ProDashbord',
      })
    }
    activeOpacity={0.7}
  >
    <View
      style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}
    >
      <Ionicons
        name="stats-chart-outline"
        size={18}
        color="#2563EB"
      />
    </View>
    <Text style={styles.entrepriseActionText}>
      Accéder au Dashboard Pro
    </Text>
    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </TouchableOpacity>
)}

                {entreprise.statutvalidation === 'en_attente' && (
                  <View style={styles.statusBox}>
                    <View style={styles.statusBoxHeader}>
                      <Ionicons name="time-outline" size={16} color="#856404" />
                      <Text style={styles.statusBoxTitle}>
                        En attente de validation
                      </Text>
                    </View>
                    <Text style={styles.statusBoxHint}>
                      Vous pouvez encore modifier votre entreprise en attendant
                      la validation.
                    </Text>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() =>
                        navigation.navigate('Accueil', {
                          screen: 'AddCompany',
                          params: { entrepriseId: entreprise.id },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#856404"
                      />
                      <Text style={styles.outlineButtonText}>
                        Modifier mon entreprise
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {entreprise.statutvalidation === 'refuse' && (
                  <View style={[styles.statusBox, styles.statusBoxRefused]}>
                    <View style={styles.statusBoxHeader}>
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color="#991B1B"
                      />
                      <Text
                        style={[styles.statusBoxTitle, { color: '#991B1B' }]}
                      >
                        Entreprise refusée
                      </Text>
                    </View>
                    {entreprise.raison_refus ? (
                      <Text style={styles.statusBoxReason}>
                        Raison : {entreprise.raison_refus}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.outlineButton, styles.outlineButtonRefused]}
                      onPress={() =>
                        navigation.navigate('Accueil', {
                          screen: 'AddCompany',
                          params: { entrepriseId: entreprise.id },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#991B1B"
                      />
                      <Text
                        style={[styles.outlineButtonText, { color: '#991B1B' }]}
                      >
                        Corriger et renvoyer
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#991B1B"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.menu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() =>
                    navigation.navigate('Accueil', { screen: 'AddCompany' })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                  <Text style={styles.menuItemText}>
                    Ajouter mon entreprise
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ============================================================
            SECTION "ADMINISTRATION" — visible uniquement pour l'admin
            ============================================================ */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Administration</Text>

            <View style={styles.menu}>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => navigation.navigate('admin')}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.menuItemIcon, { backgroundColor: '#FEF3C7' }]}
                >
                  <Ionicons name="settings-outline" size={18} color="#D97706" />
                </View>
                <Text style={styles.menuItemText}>
                  Accéder à l'administration
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ============================================================
            SECTION "MON COMPTE" — visible pour tous les rôles
            ============================================================ */}
        <Text style={styles.sectionTitle}>Mon compte</Text>

        <View style={styles.menu}>
          {/* Modifier mon profil */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
            navigation.navigate('Accueil', { screen: 'EditProfile' })
            }
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuItemIcon, { backgroundColor: '#F3F4F6' }]}
            >
              <Ionicons name="person-outline" size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuItemText}>Modifier mon profil</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Changer mot de passe */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
            navigation.navigate('Accueil', { screen: 'ChangePassword' })
            }
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuItemIcon, { backgroundColor: '#F3F4F6' }]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#4B5563"
              />
            </View>
            <Text style={styles.menuItemText}>Changer mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Notifications */}
          <View style={styles.menuItem}>
            <View
              style={[styles.menuItemIcon, { backgroundColor: '#F3F4F6' }]}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#4B5563"
              />
            </View>
            <Text style={styles.menuItemText}>Notifications</Text>
            <Switch
              value={notifActive}
              onValueChange={setNotifActive}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor="#fff"
              ios_backgroundColor="#D1D5DB"
            />
          </View>

          {/* Mode sombre */}
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View
              style={[styles.menuItemIcon, { backgroundColor: '#F3F4F6' }]}
            >
              <Ionicons name="moon-outline" size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuItemText}>Mode sombre</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor="#fff"
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* ============================================================
            DÉCONNEXION
            ============================================================ */}
        <TouchableOpacity
          style={styles.logoutLink}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#9CA3AF" />
          <Text style={styles.logoutLinkText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Bon Plan Madagascar v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scrollContent: { padding: 16, paddingTop: 24, paddingBottom: 40 },

  // ---------- EN-TÊTE ----------
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarText: { fontSize: 44, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5F6FA',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  userContact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  userContactText: { fontSize: 13, color: '#6B7280' },
  userContactSeparator: { fontSize: 13, color: '#9CA3AF', marginHorizontal: 6 },

  // ---------- SECTION TITRE ----------
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 8,
  },

  // ---------- MENU VERTICAL ----------
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },

  // ---------- CARTE ENTREPRISE (pro) ----------
  entrepriseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  entrepriseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  entrepriseIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entrepriseNom: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  entrepriseStatutLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // ---------- BOUTON DASHBOARD ----------
  
entrepriseAction: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  borderTopWidth: 1,
  borderTopColor: '#F3F4F6',
},
entrepriseActionText: {
  flex: 1,
  fontSize: 15,
  fontWeight: '500',
  color: '#111827',
},

  // ---------- BOÎTES DE STATUT (attente / refusée) ----------
  statusBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 14,
  },
  statusBoxRefused: { backgroundColor: '#FEE2E2' },
  statusBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
  },
  statusBoxHint: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.85,
    lineHeight: 17,
  },
  statusBoxReason: {
    fontSize: 13,
    color: '#991B1B',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  // Bouton bordé (attente / refusée)
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#856404',
    alignSelf: 'flex-start',
  },
  outlineButtonRefused: { borderColor: '#991B1B' },
  outlineButtonText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
  },

  // ---------- DÉCONNEXION ----------
  logoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  logoutLinkText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },

  // ---------- VERSION ----------
  version: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 11,
    color: '#D1D5DB',
  },
});