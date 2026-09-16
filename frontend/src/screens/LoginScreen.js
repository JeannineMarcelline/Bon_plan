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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ navigation }) {
  // ============================================================
  // ÉTATS DU COMPOSANT
  // ============================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ============================================================
  // OUTILS DE VALIDATION
  // ============================================================

  /**
   * Vérifie qu'une chaîne ressemble à un email valide.
   * Regex simple : quelque chose @ quelque chose . quelque chose (2+ lettres)
   * → Accepte : test@test.com, a@a.mg, jean.dupont@gmail.com
   * → Refuse  : test, test@, @test.com, test@test
   */
  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  };

  /**
   * Active ou désactive le bouton "Se connecter".
   * Le bouton reste grisé tant que l'email et le mot de passe ne sont pas remplis.
   */
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !loading;

  // ============================================================
  // CONNEXION
  // ============================================================
  const handleLogin = async () => {
    // --- Étape 1 : validation locale AVANT d'appeler Supabase ---
    // On évite ainsi des appels réseau inutiles pour des cas évidents.
    if (!email.trim() || !password) {
      Alert.alert("Champs manquants", "Veuillez remplir tous les champs.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert(
        "Email invalide",
        "Veuillez entrer une adresse email valide (ex : nom@exemple.com)."
      );
      return;
    }

    // --- Étape 2 : appel à Supabase ---
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      // --- Étape 3 : gestion des erreurs Supabase ---
      if (error) {
        // Supabase renvoie des messages en anglais. On les traduit
        // en messages clairs pour l'utilisateur.
        const msg = error.message || "";

        if (msg.includes("Invalid login credentials")) {
          // ⚠️ Sécurité : on ne dit PAS "cet email n'existe pas" (sinon
          // on donne une info aux attaquants sur quels comptes existent).
          // On reste vague : "Email ou mot de passe incorrect".
          Alert.alert(
            "Connexion refusée",
            "Email ou mot de passe incorrect."
          );
        } else if (msg.includes("Email not confirmed")) {
          // Ce cas ne se produira que si tu réactives "Confirm email"
          // dans Supabase plus tard. Le message est prêt.
          Alert.alert(
            "Email non confirmé",
            "Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation."
          );
        } else if (msg.includes("Too many requests")) {
          Alert.alert(
            "Trop de tentatives",
            "Veuillez patienter quelques minutes avant de réessayer."
          );
        } else {
          // Cas imprévu : on affiche le message brut (utile pour debug)
          Alert.alert("Erreur", msg);
        }
        return;
      }

      // --- Étape 4 : s'assurer que le profil existe dans la table utilisateurs ---
      // Le profil est une ligne dans `utilisateurs` (nom, email, rôle…).
      // Si l'auth a marché mais que le profil manque, on le crée.
      const { data: profilData, error: profilError } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profilError && profilError.code === "PGRST116") {
        // PGRST116 = "aucune ligne trouvée" → on crée le profil.
        await supabase.from("utilisateurs").insert({
          id: data.user.id,
          nom: data.user.user_metadata?.nom || "Utilisateur",
          email: data.user.email,
          role: data.user.user_metadata?.role || "client",
        });
      }

      // --- Étape 5 : message de bienvenue ---
      const nom =
        profilData?.nom || data.user.user_metadata?.nom || "Utilisateur";
      Alert.alert("Connexion réussie", `Bonjour ${nom} !`);
    } catch (error) {
      console.error("Erreur login:", error);
      Alert.alert("Erreur", "Une erreur inattendue est survenue.");
    } finally {
      // Dans TOUS les cas (succès ou échec), on arrête le spinner.
      setLoading(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* ---------- EN-TÊTE ---------- */}
            <View style={styles.header}>
              <Image
                source={require("../../assets/bonPlan.jpg")}
                style={styles.logo}
              />
              <Text style={styles.subtitle}>Connectez-vous</Text>
            </View>

            {/* ---------- FORMULAIRE ---------- */}
            <View style={styles.form}>
              {/* Champ EMAIL */}
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
                  autoCorrect={false}
                  editable={!loading} // champ désactivé pendant le chargement
                />
              </View>

              {/* Champ MOT DE PASSE avec œil pour afficher/masquer */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Votre mot de passe"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#7f8c8d"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* BOUTON SE CONNECTER
                  → désactivé tant que canSubmit est false
                  → affiche "Connexion..." pendant le chargement */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  !canSubmit && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={!canSubmit}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Text>
              </TouchableOpacity>

              {/* LIEN VERS INSCRIPTION */}
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate("Register")}
                disabled={loading}
              >
                <Text style={styles.registerLinkText}>
                  Pas encore de compte ?{" "}
                  <Text style={styles.registerLinkBold}>S'inscrire</Text>
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
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", padding: 20 },
  logo: { width: 85, height: 85, resizeMode: "contain" },
  header: { alignItems: "center", marginBottom: 30 },
  subtitle: { fontSize: 18, color: "#7f8c8d", marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#2c3e50",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#2c3e50",
  },
  eyeIcon: { paddingHorizontal: 14 },
  loginButton: {
    backgroundColor: "#007BFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: { backgroundColor: "#B0C4DE" },
  loginButtonText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  registerLink: { marginTop: 16, alignItems: "center" },
  registerLinkText: { fontSize: 14, color: "#7f8c8d" },
  registerLinkBold: { color: "#007BFF", fontWeight: "bold" },
});