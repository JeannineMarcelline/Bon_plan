import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';


const AuthContext = createContext();

export function AuthProvider({ children }) {
  
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const isRegisteringRef = useRef(false);

 
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchProfile = async (authUser, retriesLeft = 2) => {
    if (!authUser) return null;

    const { data: profil, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.log(' Erreur récupération profil:', error.message);
    }

   
    if (!profil && retriesLeft > 0) {
      console.log(` Profil pas encore trouvé, nouvelle tentative dans 400ms... (${retriesLeft} restantes)`);
      await wait(400);
      return fetchProfile(authUser, retriesLeft - 1);
    }

    return {
      id: authUser.id,
      email: authUser.email,
      ...profil,
    };
  };

  
  useEffect(() => {
    
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        setUser(fullUser);
      }

      setLoading(false);
    };

    initSession();
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(' Auth event:', event); // ex: SIGNED_IN, SIGNED_OUT...

    
        if (isRegisteringRef.current) {
          console.log(' Inscription en cours, onAuthStateChange met setUser en pause');
          setLoading(false);
          return;
        }

        if (session?.user) {
        
          const fullUser = await fetchProfile(session.user);
          setUser(fullUser);
        } else {
          
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);
  
  const register = async (nom, email, password, telephone, role = 'user') => {
   
    isRegisteringRef.current = true;

    try {
   
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nom, role, telephone },
        },
      });

      if (error) throw error;
      if (data.user) {
        const { error: profilError } = await supabase.from('utilisateurs').upsert({
          id: data.user.id, // même id que dans auth.users → very important
          nom,
          email,
          telephone,
          role,
        });

        
        if (profilError) {
          console.log('⚠️ Erreur insertion profil:', profilError.message);
        }
      }

     
      const fullUser = await fetchProfile(data.user);
      setUser(fullUser);

      return { success: true, user: fullUser };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
     
      isRegisteringRef.current = false;
    }
  };

 
  const login = async (email, password) => {
    try {
    
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const fullUser = await fetchProfile(data.user);
      setUser(fullUser);

      return { success: true, user: fullUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  
  const logout = async () => {
   
    await supabase.auth.signOut();
    setUser(null);
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
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return context;
};