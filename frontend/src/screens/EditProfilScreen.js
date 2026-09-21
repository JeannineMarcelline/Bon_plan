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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation();

  const [nom, setNom] = useState(user?.nom || '');
  const [telephone, setTelephone] = useState(user?.telephone || '');
  const [loading, setLoading] = useState(false);

  // Formatte le numéro malgache : 0341234567 → 034 12 345 67
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5 || i === 8) formatted += ' ';
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handleSubmit = async () => {
    // Validation
    if (!nom.trim()) {
      Alert.alert('Champs manquants', 'Veuillez saisir votre nom.');
      return;
    }

    const digitsPhone = telephone.replace(/\D/g, '');
    if (digitsPhone.length !== 10) {
      Alert.alert(
        'Téléphone invalide',
        'Le numéro doit contenir 10 chiffres (ex : 034 12 345 67).'
      );
      return;
    }

    // Vérifier que le téléphone n'est pas déjà pris par un AUTRE utilisateur
    setLoading(true);

    const { data: existing, error: checkError } = await supabase
      .from('utilisateurs')
      .select('id')
      .eq('telephone', telephone)
      .neq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Erreur vérif téléphone:', checkError);
      Alert.alert('Erreur', 'Impossible de vérifier le numéro.');
      setLoading(false);
      return;
    }

    if (existing) {
      Alert.alert(
        'Numéro déjà utilisé',
        'Ce numéro est déjà associé à un autre compte.'
      );
      setLoading(false);
      return;
    }

    // Mettre à jour le profil
    try {
      const { error } = await supabase
        .from('utilisateurs')
        .update({
          nom: nom.trim(),
          telephone: telephone.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

       await refreshUser();

      Alert.alert('Succès', 'Votre profil a été mis à jour.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);

    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour votre profil.');
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
          <Text style={styles.title}>Modifier mon profil</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info en haut */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#2563EB"
            />
            <Text style={styles.infoText}>
              Vous pouvez modifier votre nom et votre numéro de téléphone. Pour
              changer d'email, contactez-nous.
            </Text>
          </View>

          {/* Email (non modifiable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.inputDisabledText}>{user?.email}</Text>
            </View>
            <Text style={styles.hint}>L'email ne peut pas être modifié.</Text>
          </View>

          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Votre nom"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          {/* Téléphone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={(text) => setTelephone(formatPhoneNumber(text))}
              placeholder="034 00 000 00"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={13}
              editable={!loading}
            />
          </View>

          {/* Bouton Enregistrer */}
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Enregistrer</Text>
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
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  inputDisabledText: { fontSize: 16, color: '#6B7280' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});