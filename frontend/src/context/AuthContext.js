import React, { createContext, useState, useContext, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '../database/database';

const AuthContext = createContext();

const hashPassword = async (password) => {
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hashed;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const register = async (nom, email, password, telephone, role) => {
    try {
      const existing = await db.getAllAsync(
        'SELECT * FROM utilisateurs WHERE email = ?',
        [email]
      );
      if (existing.length > 0) {
        throw new Error('Cet email est déjà utilisé');
      }

      const hashedPassword = await hashPassword(password);
      const result = await db.runAsync(
        `INSERT INTO utilisateurs (nom, email, motDePasse, telephone, role)
         VALUES (?, ?, ?, ?, ?)`,
        [nom, email, hashedPassword, telephone, role]
      );

      const newUser = await db.getAllAsync(
        'SELECT * FROM utilisateurs WHERE id = ?',
        [result.lastInsertRowId]
      );
      const userData = newUser[0];
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const hashedPassword = await hashPassword(password);
      const users = await db.getAllAsync(
        'SELECT * FROM utilisateurs WHERE email = ? AND motDePasse = ?',
        [email, hashedPassword]
      );

      if (users.length === 0) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const userData = users[0];  // ← CORRIGÉ

      if (userData.statut === 'suspendu') {
        throw new Error('Votre compte a été suspendu');
      }

      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };  // ← FIN de login

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  }
  return context;
};


