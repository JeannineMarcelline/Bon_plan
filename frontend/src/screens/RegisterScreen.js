import React, { useState } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();


  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /** Email valide ? */
  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

 
  
  const getPasswordStrength = (pwd) => {
    if (!pwd || pwd.length === 0) return 0;
    if (pwd.length < 6) return 1;

    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 8 && hasUpper && hasDigit && hasSpecial) return 3;
    if (hasLetter && hasDigit) return 2;
    return 1;
  };

  const getStrengthMeta = (level) => {
    switch (level) {
      case 1:
        return { label: "Faible", color: "#EF4444", width: "33%" };
      case 2:
        return { label: "Moyen", color: "#F59E0B", width: "66%" };
      case 3:
        return { label: "Fort", color: "#10B981", width: "100%" };
      default:
        return { label: "", color: "transparent", width: "0%" };
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthMeta = getStrengthMeta(passwordStrength);

 
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 10);
    let formatted = "";
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5 || i === 8) formatted += " ";
      formatted += cleaned[i];
    }
    return formatted;
  };

  /** Le bouton est-il activable ? */
  const canSubmit =
    nom.trim() &&
    email.trim() &&
    password.length >= 6 &&
    telephone.replace(/\D/g, "").length >= 9 &&
    !loading;

  const handleRegister = async () => {

    if (!nom.trim() || !email.trim() || !password || !telephone) {
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

    if (password.length < 6) {
      Alert.alert(
        "Mot de passe trop court",
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    const digitsPhone = telephone.replace(/\D/g, "");
    if (digitsPhone.length < 9) {
      Alert.alert(
        "Téléphone invalide",
        "Veuillez entrer un numéro de téléphone valide (ex : 034 12 345 67)."
      );
      return;
    }

    setLoading(true);

    const{data: existingPhone, error: phoneError} = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('telephone', telephone)
    .maybeSingle();

    if(phoneError){
    console.error('Erreur vérif téléphone:', phoneError);
    Alert.alert('Erreur', 'Impossible de vérifier le numéro. Réessayer');
    setLoading(false);
    return;
    }

    if(existingPhone){
      Alert.alert("Numéro déjà utilisé", "Ce numéro de téléphone est déjà associé à un compte. Utilisez un autre numéro ou connectez-vous.");
      setLoading(false);
      return;
    }


    const result = await register(
      nom.trim(),
      email.trim().toLowerCase(),
      password,
      telephone,
      role
    );
    
    setLoading(false);

    // --- Gestion de l'erreur ---
    if (!result.success) {
      console.log("Erreur inscription:", result.error);
      const err = result.error || "";

      if (err.includes("User already registered")) {
        Alert.alert(
          "Email déjà utilisé",
          "Un compte existe déjà avec cet email. Essayez de vous connecter."
        );
      } else if (err.includes("Password should be at least")) {
        Alert.alert(
          "Mot de passe trop court",
          "Le mot de passe doit contenir au moins 6 caractères."
        );
      } else if (err.includes("Invalid email")) {
        Alert.alert("Email invalide", "Veuillez vérifier votre adresse email.");
      } else {
        Alert.alert("Erreur", err);
      }
      return;
    }

    // --- Succès ---
    Alert.alert(
      "Inscription réussie",
      `Bienvenue ${nom} ! Vous êtes maintenant ${
        role === "pro" ? "professionnel" : "client"
      }.`
    );
  };

  
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
   
          <View style={styles.header}>
            <Image
              source={require("../../assets/bonPlan.jpg")}
              style={styles.logo}
            />
            <Text style={styles.subtitle}>Créer un compte</Text>
          </View>

          <View style={styles.form}>
        
            <View style={styles.roleContainer}>
              <Text style={styles.label}>Je suis un :</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    role === "client" && styles.segmentButtonActive,
                  ]}
                  onPress={() => setRole("client")}
                  disabled={loading}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={role === "client" ? "#2563EB" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      role === "client" && styles.segmentTextActive,
                    ]}
                  >
                    Client
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    role === "pro" && styles.segmentButtonActive,
                  ]}
                  onPress={() => setRole("pro")}
                  disabled={loading}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={role === "pro" ? "#2563EB" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      role === "pro" && styles.segmentTextActive,
                    ]}
                  >
                    Professionnel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ---------- NOM ---------- */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                placeholderTextColor="#9CA3AF"
                value={nom}
                onChangeText={setNom}
                editable={!loading}
              />
            </View>

            {/* ---------- EMAIL ---------- */}
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
                editable={!loading}
              />
            </View>

            {/* ---------- MOT DE PASSE + INDICATEUR DE FORCE ---------- */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  // ✅ CORRIGÉ : "placeholder" (et non "ptlaceholder")
                  placeholder="Au moins 6 caractères"
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

              {/* Indicateur de force : affiché uniquement si l'utilisateur
                  a commencé à taper (passwordStrength > 0) */}
              {passwordStrength > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: strengthMeta.width,
                          backgroundColor: strengthMeta.color,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: strengthMeta.color },
                    ]}
                  >
                    {strengthMeta.label}
                  </Text>
                </View>
              )}
            </View>

            {/* ---------- TÉLÉPHONE ---------- */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="034 00 000 00"
                placeholderTextColor="#9CA3AF"
                value={telephone}
                onChangeText={(text) => setTelephone(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                maxLength={13}
                editable={!loading}
              />
            </View>

            {/* ---------- BOUTON INSCRIPTION ---------- */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                !canSubmit && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!canSubmit}
            >
              <Text style={styles.registerButtonText}>
                {loading ? "Inscription en cours..." : "S'inscrire"}
              </Text>
            </TouchableOpacity>

            {/* ---------- LIEN CONNEXION ---------- */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={styles.loginLinkText}>
                Déjà un compte ?{" "}
                <Text style={styles.loginLinkBold}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logo: { width: 85, height: 85, resizeMode: "contain" },
  header: { alignItems: "center", marginBottom: 24 },
  subtitle: { fontSize: 18, color: "#6B7280", marginTop: 4 },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  roleContainer: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  segmentTextActive: { color: "#2563EB" },

  inputContainer: { marginBottom: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    color: "#111827",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16, // était à 12 dans ton code, corrigé en 16 pour la lisibilité
    color: "#111827",
  },
  eyeIcon: { paddingHorizontal: 14 },

  // Indicateur de force
  strengthWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 10,
  },
  strengthBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  strengthBarFill: { height: "100%", borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: "600", minWidth: 45 },

  registerButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  loginLink: { marginTop: 16, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#6B7280" },
  loginLinkBold: { color: "#2563EB", fontWeight: "bold" },
});