import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VehicleCard({ vehicle, onEdit, onDelete }) {
  // Calcul du pourcentage de places réservées
  const placesReservees = vehicle.nb_reservations || 0;
  const placesTotales = vehicle.nb_places || vehicle.capacite || 0;
  const pourcentage = placesTotales > 0 ? (placesReservees / placesTotales) * 100 : 0;

  // Image par défaut si pas de photo
  const defaultImage = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=400&fit=crop';

  return (
    <View style={styles.card}>
      {/* Image en grand */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: vehicle.photo || defaultImage }} 
          style={styles.image} 
          resizeMode="cover"
        />
        
        {/* Overlay sur l'image : Type à gauche, Prix à droite */}
        <View style={styles.overlay}>
          <View style={styles.typeBadge}>
            <Ionicons name="bus-outline" size={16} color="#FFFFFF" />
            <Text style={styles.typeText}>{vehicle.type || 'Bus'}</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{vehicle.prix_place || vehicle.prix || 0} Ar</Text>
            <Text style={styles.priceLabel}>/ place</Text>
          </View>
        </View>
      </View>

      {/* Informations du véhicule */}
      <View style={styles.infoSection}>
        <Text style={styles.vehicleName}>{vehicle.nom}</Text>

        {/* Itinéraire */}
        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={18} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {vehicle.ville_depart || 'Départ'} → {vehicle.ville_arrivee || 'Arrivée'}
          </Text>
        </View>

        {/* Date + Heure */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#6B7280" />
          <Text style={styles.infoText}>{vehicle.date_depart || 'Date'}</Text>
          <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.iconSpacing} />
          <Text style={styles.infoText}>{vehicle.heure_depart || 'Heure'}</Text>
        </View>

        {/* Barre de progression des places */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Places réservées</Text>
            <Text style={styles.progressCount}>
              {placesReservees} / {placesTotales} places
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(pourcentage, 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={onEdit}
        >
          <Ionicons name="pencil-outline" size={18} color="#2563EB" />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Image
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Overlay sur l'image
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },

  // Section informations
  infoSection: {
    padding: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    flex: 1,
  },
  iconSpacing: {
    marginLeft: 12,
  },

  // Barre de progression
  progressContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
});