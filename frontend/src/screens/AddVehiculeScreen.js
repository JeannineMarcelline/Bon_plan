import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import db from '../database/database';
import { Ionicons } from '@expo/vector-icons';


export default function AddVehiculeScreen ({navigation}) {
   const {user} = useAuth('')


} 