import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // 👈 on utilise le contexte, pas Supabase directement

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth(); // 👈 on récupère la fonction déjà écrite dans AuthContext

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
  };

 const formatPhoneNumber = (text) => {
 
  const cleaned = text.replace(/\D/g, '');

  const limited = cleaned.slice(0, 10);

  let formatted = '';

  for (let i = 0; i < limited.length; i++) {
    if (i === 3 || i === 5 || i === 8) {
      formatted += ' ';
    }
    formatted += limited[i];
  }
  
  return formatted;
};
  const handleRegister = async () => {
    
    if (!nom || !email || !password || !telephone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

   
    const result = await register(nom, email, password, telephone, role);

    setLoading(false);

    if (!result.success) {
      console.log(' Erreur inscription:', result.error);

      if (result.error.includes('User already registered')) {
        Alert.alert('Erreur', 'Cet email est déjà utilisé. Veuillez vous connecter.');
      } else {
        Alert.alert('Erreur', result.error);
      }
      return;
    }

    
    Alert.alert(
      'Inscription réussie ',
      `Bienvenue ${nom} ! Vous êtes maintenant un ${role === 'pro' ? 'professionnel' : 'client'}.`
    );

   
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
        <View style={styles.header}>
          <Image source={require('../../assets/bonPlan.jpg')} style={styles.logo} />
          <Text style={styles.subtitle}>Créer un compte</Text>
        </View>

        <View style={styles.form}>
          {/* Segmented Control Client/Professionnel */}
          <View style={styles.roleContainer}>
            <Text style={styles.label}>Je suis un :</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  role === 'client' && styles.segmentButtonActive
                ]}
                onPress={() => handleRoleSelect('client')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={role === 'client' ? '#2563EB' : '#6B7280'}
                />
                <Text style={[
                  styles.segmentText,
                  role === 'client' && styles.segmentTextActive
                ]}>
                  Client
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  role === 'pro' && styles.segmentButtonActive
                ]}
                onPress={() => handleRoleSelect('pro')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={16}
                  color={role === 'pro' ? '#2563EB' : '#6B7280'}
                />
                <Text style={[
                  styles.segmentText,
                  role === 'pro' && styles.segmentTextActive
                ]}>
                  Professionnel
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Champs du formulaire */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre nom"
              placeholderTextColor="#9CA3AF"
              value={nom}
              onChangeText={setNom}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
             <View style={styles.passwordContainer} >
              <TextInput
              style={styles.passwordInput}
              ptlaceholder="Au moins 6 caractères"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
             <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} >
             <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#7f8c8d" />
            </TouchableOpacity>
            </View>  
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
           <TextInput
          style={styles.input}
          placeholder="034 00 000 00"
          placeholderTextColor="#9CA3AF"
          value={telephone}
          onChangeText={(text) => {
          const formatted = formatPhoneNumber(text);
          setTelephone(formatted);
              }}
  keyboardType="phone-pad"
  maxLength={13} 
/>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Inscription en cours...' : "S'inscrire"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
         </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 85,
    height: 85,
    resizeMode: 'contain',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  roleContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#2563EB',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
  },
  passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    passwordInput: {
      flex: 1, 
      padding: 13,
      fontSize: 12,
      color: '#2c3e50',
    },
    eyeIcon: {
      paddingHorizontal: 14,
    },
  registerButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLinkBold: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});