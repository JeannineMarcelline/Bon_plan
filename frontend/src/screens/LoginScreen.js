import React, {useState} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert, 
} from 'react-native';
import {useAuth} from '../context/AuthContext';

export default function LoginScreen({navigation}){

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);

const { login } = useAuth();

const handleLogin = async() => {
    if(!email || !password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
    }
    setLoading(true);
    try{
     const result = await login (email, password);
     if(result.success){
        Alert.alert(
            'Connexion réussie', 
            `Bonjour ${result.user.nom} !`,
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
     }else{
        Alert.alert('Erreur', result.error);
     }
    }catch(error){
       Alert.alert('Erreur', 'Une erreur est survenue')
    }finally{
        setLoading(false);
    }
};

return(
    <SafeAreaView style={styles.container}>
     <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🏝️ Bon Plan</Text>
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
            <TextInput
              style={styles.input}
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
         </View>
       <TouchableOpacity
       style={styles.loginButton}
       onPress={handleLogin}
       disabled={loading}
       >
        <Text style={styles.loginButtonText}>
             {loading ? 'Connexion en cours...' : 'Se connecter'}
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
  loginButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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

