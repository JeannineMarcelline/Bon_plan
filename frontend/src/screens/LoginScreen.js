import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from "../lib/supabase";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  
  const testSupabaseConnection = async () => {
  try {
    console.log(' Test de connexion Supabase...');
    

    console.log(' URL:', supabase.supabaseUrl);
    console.log(' Clé:', supabase.supabaseKey ? 'Présente ' : 'Manquante ');
   
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(' Erreur de requête:', error);
    } else {
      console.log('Connexion réussie!', data);
    }
  } catch (error) {
    console.log(' Erreur de connexion:', error);
  }
};



  const handleLogin = async () => {

    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      console.log('Tentative de connexion avec:', email);

  
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.log(' Erreur de connexion:', error.message);
        
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Erreur', 'Email ou mot de passe incorrect');
        } else if (error.message.includes('Email not confirmed')) {
          Alert.alert('Erreur', 'Veuillez confirmer votre email');
        } else {
          Alert.alert('Erreur', error.message);
        }
        setLoading(false);
        return;
      }

      console.log(' Utilisateur connecté:', data.user.email);
      console.log(' User ID:', data.user.id);

      const { data: profilData, error: profilError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle(); 

      if (profilError) {
        console.log(' Erreur profil:', profilError.message);
        
        if (profilError.code === 'PGRST116') { // Code pour "no rows"
          console.log('📝 Création du profil...');
          
          const { error: insertError } = await supabase
            .from('utilisateurs')
            .insert({
              id: data.user.id,
              nom: data.user.user_metadata?.nom || 'Utilisateur',
              email: data.user.email,
              role: data.user.user_metadata?.role || 'user'
            });

          if (insertError) {
            console.log(' Erreur création profil:', insertError);
          } else {
            console.log(' Profil créé avec succès');
          }
        }
      }

     
      const nomUtilisateur = profilData?.nom || data.user.user_metadata?.nom || 'Utilisateur';
      Alert.alert(
   ' Connexion réussie',
  `Bonjour ${nomUtilisateur} !`
);

    } catch (error) {
      console.log('❌ ERREUR:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
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
          <View style={styles.content}>
            <View style={styles.header}>
              <Image source={require('../../assets/bonPlan.jpg')} style={styles.logo} />
              <Text style={styles.subtitle}>Connectez-vous</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
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
                  placeholder="Votre mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                 <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                 >
                <Ionicons
                 name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                 size={22}
                 color="#7f8c8d"
                 />
                 </TouchableOpacity>
             </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerLinkText}>
                  Pas encore de compte ? <Text style={styles.registerLinkBold}>S'inscrire</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
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
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#2c3e50',
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
      flex: 1, // prend toute la place disponible, sauf celle de l'icône
      padding: 14,
      fontSize: 16,
      color: '#2c3e50',
    },
    eyeIcon: {
      paddingHorizontal: 14,
    },
  loginButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#87CEEB',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  registerLinkBold: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
});