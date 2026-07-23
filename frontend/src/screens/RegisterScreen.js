import React, {useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';

export default function RegisterScreen({navigation}) {

    const [nom, setNom] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [telephone, setTelephone] = useState('');
    const [role, setRole] = useState('client');
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(false);
 
    
  const { register } = useAuth();

    const handleRoleChange = (value) => {
        setIsPro(value);
        setRole(value ? 'pro' : 'client');
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
        try{
            const result = await register(nom, email, password, telephone, role);
            if(result.success) {
                Alert.alert(
                    'Insrciption réussie', 
            `Bienvenue ${result.user.nom} ! Vous êtes maintenant un ${role}.`,
             //[{ text: 'OK', onPress: () => navigation.navigate('Accueil', { screen: 'Home' })}]
                );
            }else{
                Alert.alert('Erreur', result.error);
            }
        }catch(error) {
           console.log('❌ ERREUR EXACTE:', error);
           Alert.alert('Erreur', error.message || 'Une erreur est survenue');
        } finally{
            setLoading(false);
        }
    };

    return(
        <SafeAreaView style={styles.container}>
         <ScrollView contentContainerStyle={styles.scrollContent}>
         <View style={styles.header}>
          <Text style={styles.title}>🏝️ Bon Plan</Text>
          <Text style={styles.subtitle}>Créer un compte</Text>
         </View>

         <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom complet</Text>
              <TextInput
              style={styles.input}
              placeholder="votre nom"
              value={nom}
              onChangeText={setNom}
            />
          </View>

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
              <TextInput
              style={styles.input}
              placeholder="Au moins 6 caractères"
              value={password}
              onChangeText={setPassword} 
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
              <TextInput
              style={styles.input}
              placeholder="034 00 000 00"
              value={telephone}
              onChangeText={setTelephone}
             keyboardType="phone-pad"
            />
          </View>
         <View>
            <Text style={styles.label}>Je suis un :</Text>
            <View style={styles.rolesSwitch}>
              <Text style={[styles.roleText, !isPro && styles.roleActive]}>Client</Text>
              <Switch
              value={isPro}
              onValueChange={handleRoleChange}
              trackColor={{ false: '#ddd', true: '#007BFF' }}
              thumbColor={isPro ? '#fff' : '#fff'}
              />
               <Text style={[styles.roleText, isPro && styles.roleActive]}>Professionnel</Text>
            </View>
         </View>

    <TouchableOpacity
     style={styles.registerButton}
     onPress={handleRegister}
     disabled={loading}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
   title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
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
  roleContainer: {
    marginBottom: 20,
  },
  roleSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  roleText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  roleActive: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
   registerButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
   loginLinkText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  loginLinkBold: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
});