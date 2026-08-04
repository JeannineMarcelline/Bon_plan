import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import db from "../database/database";

export default function CompanyVehiculeScreen({ route, navigation }) {
  const { idEntreprise } = route.params;
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const loadVehicules = async () => {
      try {
        const result = await db.getAllAsync(
          `SELECT * FROM vehicules WHERE id_entreprise = ?`,
          [idEntreprise]
        );
        setVehicules(result);
      } catch (error) {
        console.error("Erreur chargement véhicules", error);
      } finally {
        setLoading(false);
      }
    };
    loadVehicules();
  }, []);

  const openImageModal = (photoUri) => {
    if (photoUri) {
      setSelectedPhoto(photoUri);
      setModalVisible(true);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date non définie";
    const parts = date.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const renderVehicule = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("Places", { idVehicule: item.id_vehicule })}
      activeOpacity={0.8}
    >
      {/* Photo du véhicule avec zoom */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openImageModal(item.photo)}
      >
        <View style={styles.imageContainer}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="car-outline" size={40} color="#aaa" />
              <Text style={styles.imagePlaceholderText}>Aucune photo</Text>
            </View>
          )}
          {item.photo && (
            <View style={styles.zoomIcon}>
              <Ionicons name="expand-outline" size={16} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Infos */}
      <View style={styles.infoContainer}>
        <Text style={styles.vehiculeNom}>{item.nom}</Text>
        <Text style={styles.vehiculeType}>{item.type || "Véhicule"}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6C757D" />
          <Text style={styles.vehiculeInfo}>
            {formatDate(item.date_depart)} à {item.heure_depart || "--:--"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#6C757D" />
          <Text style={styles.vehiculeInfo}>
            {item.ville_depart} → {item.ville_arrivee}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#6C757D" />
          <Text style={styles.vehiculePrice}>{item.prix_place} Ar / place</Text>
        </View>

        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Ionicons name="people-outline" size={14} color="#2e7d32" />
            <Text style={styles.badgeText}>{item.capacite} places</Text>
          </View>
        </View>
      </View>

      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>🚐 Véhicules disponibles</Text>
      </View>

      {vehicules.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Aucun véhicule disponible</Text>
        </View>
      ) : (
        <FlatList
          data={vehicules}
          keyExtractor={(item) => item.id_vehicule.toString()}
          renderItem={renderVehicule}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ===== MODAL POUR AGRANDIR LA PHOTO ===== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close-circle" size={44} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginLeft: 12,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "center",
  },
  imageContainer: {
    marginRight: 14,
    position: "relative",
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: "#aaa",
    marginTop: 4,
  },
  zoomIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4,
  },
  infoContainer: {
    flex: 1,
  },
  vehiculeNom: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  vehiculeType: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 1,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  vehiculeInfo: {
    fontSize: 13,
    color: "#6C757D",
    marginLeft: 6,
  },
  vehiculePrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E3A5F",
    marginLeft: 6,
  },
  badgeContainer: {
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    gap: 4,
  },
  badgeText: {
    color: "#2e7d32",
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    paddingLeft: 6,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6C757D",
    marginTop: 12,
  },
  // ===== STYLES DU MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalImage: {
    width: "95%",
    height: "85%",
    borderRadius: 12,
  },
});