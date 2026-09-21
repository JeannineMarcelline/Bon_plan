import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Mot de passe trop court',
        'Le nouveau mot de passe doit contenir au moins 6 caractères.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Mots de passe différents',
        'Le nouveau mot de passe et la confirmation ne correspondent pas.'
      );
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert(
        'Mot de passe identique',
        'Le nouveau mot de passe doit être différent de l\'ancien.'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Vérifier le mot de passe actuel en essayant de se reconnecter
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;

      if (!email) {
        Alert.alert('Erreur', 'Impossible de récupérer votre compte.');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert(
          'Mot de passe incorrect',
          'Votre mot de passe actuel est incorrect.'
        );
        setLoading(false);
        return;
      }

      // 2. Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert('Succès', 'Votre mot de passe a été modifié.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      Alert.alert('Erreur', 'Impossible de modifier votre mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Changer mot de passe</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={18} color="#2563EB" />
            <Text style={styles.infoText}>
              Pour votre sécurité, saisissez votre mot de passe actuel avant
              d'en définir un nouveau.
            </Text>
          </View>

          {/* Mot de passe actuel */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe actuel *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Votre mot de passe actuel"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrent(!showCurrent)}
              >
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nouveau mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nouveau mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Au moins 6 caractères"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNew(!showNew)}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmer */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le nouveau mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Retapez le nouveau mot de passe"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirm(!showConfirm)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton */}
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Modifier le mot de passe
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: { paddingHorizontal: 14 },

  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});