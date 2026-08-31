import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// createContext() crée une "boîte" globale qui va contenir les infos
// de connexion (user, loading, etc.) accessible depuis N'IMPORTE QUEL
// écran de l'app, sans avoir à passer les props manuellement partout.
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // user = l'utilisateur actuellement connecté (ou null si personne n'est connecté)
  const [user, setUser] = useState(null);

  // loading = true pendant qu'on vérifie s'il y a déjà une session active
  // (utile au tout premier lancement de l'app, pour ne pas afficher
  // l'écran de Login pendant une fraction de seconde avant de rediriger
  // vers l'accueil si l'utilisateur était déjà connecté)
  const [loading, setLoading] = useState(true);

  // Ce "drapeau" (useRef, pas useState, car on n'a pas besoin de
  // redéclencher un re-render quand il change) sert à dire à
  // onAuthStateChange : "ne touche pas à user en ce moment, register()
  // est déjà en train de s'en occuper lui-même". Ça évite la course
  // (race condition) entre les deux qui causait le bug "Non défini".
  const isRegisteringRef = useRef(false);

  // ────────────────────────────────────────────────────────────
  // fetchProfile : va chercher les infos "métier" de l'utilisateur
  // ────────────────────────────────────────────────────────────
  // Pourquoi cette fonction existe ?
  // Supabase Auth gère uniquement l'IDENTITÉ (email, id, mot de passe).
  // Il ne connaît pas le "nom" ou le "role" (admin/user) de la personne.
  // Ces infos-là, TOI tu les as stockées dans une table SQL classique :
  // public.utilisateurs.
  // Donc après chaque connexion, il faut faire une 2e requête pour
  // récupérer ces infos supplémentaires et les "fusionner" avec
  // l'utilisateur Auth.
  // Petit utilitaire qui "attend" un nombre de millisecondes donné.
  // Utilisé ci-dessous pour patienter avant de réessayer une requête.
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchProfile = async (authUser, retriesLeft = 2) => {
    if (!authUser) return null;

    // .from('utilisateurs')      → on cible la table "utilisateurs"
    // .select('*')                → on veut toutes les colonnes (nom, role, etc.)
    // .eq('id', authUser.id)      → uniquement la ligne où id = l'id de l'utilisateur connecté
    // .maybeSingle()               → on attend 0 ou 1 résultat (pas un tableau).
    //                                Si 0 résultat → renvoie null au lieu de planter
    //                                (contrairement à .single() qui lève une erreur
    //                                si la ligne n'existe pas)
    const { data: profil, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.log('⚠️ Erreur récupération profil:', error.message);
    }

    // ⚠️ CAS PARTICULIER : juste après une inscription, il peut arriver que
    // ce fetchProfile() se déclenche (via onAuthStateChange) AVANT que la
    // ligne dans "utilisateurs" ait fini d'être insérée (course entre deux
    // opérations asynchrones). Si on ne trouve encore rien, on patiente un
    // court instant et on réessaie, plutôt que d'afficher un profil vide.
    if (!profil && retriesLeft > 0) {
      console.log(`⏳ Profil pas encore trouvé, nouvelle tentative dans 400ms... (${retriesLeft} restantes)`);
      await wait(400);
      return fetchProfile(authUser, retriesLeft - 1);
    }

    // On construit un seul objet "user" qui combine :
    // - les infos venant de Supabase Auth (id, email → toujours fiables)
    // - les infos venant de ta table utilisateurs (nom, role, etc.)
    // Le "..." (spread) copie toutes les propriétés de "profil" dans l'objet.
    return {
      id: authUser.id,
      email: authUser.email,
      ...profil,
    };
  };

  // ────────────────────────────────────────────────────────────
  // useEffect : tout ce qui se passe au DÉMARRAGE de l'app
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1) Dès que l'app se lance, on demande à Supabase :
    //    "est-ce qu'il y a déjà une session sauvegardée sur ce téléphone ?"
    //    (Supabase sauvegarde automatiquement le token de connexion en
    //    stockage local, donc pas besoin de gérer ça toi-même comme
    //    tu le faisais avant avec AsyncStorage.setItem('user', ...))
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Si une session existe déjà (utilisateur déjà connecté avant),
      // on récupère son profil complet et on le stocke dans "user"
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        setUser(fullUser);
      }

      // Que l'utilisateur soit connecté ou non, le chargement initial
      // est terminé → on peut arrêter d'afficher l'écran de chargement
      setLoading(false);
    };

    initSession();

    // 2) onAuthStateChange : c'est LE point le plus important à comprendre.
    //
    // C'est un "espion" (listener) fourni par Supabase qui reste actif
    // EN PERMANENCE et qui se déclenche automatiquement à chaque
    // changement d'état d'authentification, par exemple :
    //   - "SIGNED_IN"   → quelqu'un vient de se connecter (login réussi)
    //   - "SIGNED_OUT"  → quelqu'un vient de se déconnecter
    //   - "TOKEN_REFRESHED" → Supabase a renouvelé le token en arrière-plan
    //
    // C'est ÇA qui manquait dans ton ancien code : avant, quand
    // LoginScreen.js appelait supabase.auth.signInWithPassword(),
    // personne n'était à l'écoute pour prévenir AuthContext que
    // quelqu'un venait de se connecter. Résultat : "user" restait
    // à null et l'app ne redirigeait jamais.
    //
    // Avec onAuthStateChange, dès que signInWithPassword() réussit
    // quelque part dans l'app (ici ou ailleurs), cette fonction se
    // déclenche AUTOMATIQUEMENT et met à jour "user" → AppNavigator.js
    // détecte le changement et affiche MainTabs au lieu de AuthStack.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event); // ex: SIGNED_IN, SIGNED_OUT...

        // Si une inscription est en cours (register() a levé le drapeau),
        // on laisse register() gérer lui-même setUser() une fois qu'il a
        // fini d'insérer le profil. On évite ainsi que ce listener écrase
        // "user" avec un profil vide trouvé trop tôt.
        if (isRegisteringRef.current) {
          console.log('⏸️ Inscription en cours, onAuthStateChange met setUser en pause');
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Un utilisateur est connecté → on va chercher son profil complet
          const fullUser = await fetchProfile(session.user);
          setUser(fullUser);
        } else {
          // Plus personne n'est connecté (déconnexion)
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Fonction de "nettoyage" : quand AuthProvider est démonté
    // (en pratique, quasiment jamais tant que l'app tourne), on
    // désactive l'espion pour éviter des fuites de mémoire.
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []); // [] = ce useEffect ne s'exécute qu'une seule fois, au montage

  // ────────────────────────────────────────────────────────────
  // register : créer un nouveau compte
  // ────────────────────────────────────────────────────────────
  const register = async (nom, email, password, telephone, role = 'user') => {
    // On lève le drapeau AVANT signUp() : dès que signUp() est appelé,
    // onAuthStateChange peut se déclencher à tout moment, donc il faut
    // que le drapeau soit déjà actif.
    isRegisteringRef.current = true;

    try {
      // supabase.auth.signUp() est la fonction OFFICIELLE de Supabase
      // pour créer un utilisateur. Contrairement à ton ancien script SQL
      // fait à la main, elle remplit TOUTES les colonnes obligatoires
      // correctement (auth.users ET auth.identities) → pas de risque
      // de retomber sur l'erreur "Database error querying schema".
      //
      // options.data → des métadonnées libres qu'on peut attacher à
      // l'utilisateur (visible ensuite dans user_metadata). Pratique
      // pour garder une trace du nom/role au moment de l'inscription,
      // même si la vraie source de vérité reste ta table utilisateurs.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nom, role, telephone },
        },
      });

      if (error) throw error;

      // signUp() crée l'utilisateur côté Auth, mais PAS dans ta table
      // "utilisateurs" (ce sont deux systèmes séparés, souviens-toi).
      // On insère donc manuellement la ligne correspondante.
      //
      // .upsert() = "update ou insert" : si une ligne avec cet id
      // existe déjà, elle est mise à jour ; sinon elle est créée.
      // C'est plus sûr qu'un simple .insert() qui échouerait si la
      // ligne existait déjà pour une raison quelconque.
      if (data.user) {
        const { error: profilError } = await supabase.from('utilisateurs').upsert({
          id: data.user.id, // même id que dans auth.users → very important
          nom,
          email,
          telephone,
          role,
        });

        // On log l'erreur si l'insertion du profil échoue, pour ne plus
        // jamais avoir un échec silencieux comme précédemment.
        if (profilError) {
          console.log('⚠️ Erreur insertion profil:', profilError.message);
        }
      }

      // Maintenant que le profil est bien inséré en base, on va le
      // chercher et on met "user" à jour nous-mêmes, en toute sécurité
      // puisque onAuthStateChange restera en pause tant que le drapeau
      // est levé.
      const fullUser = await fetchProfile(data.user);
      setUser(fullUser);

      return { success: true, user: fullUser };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // On baisse le drapeau dans tous les cas (succès ou erreur), pour
      // que onAuthStateChange reprenne son fonctionnement normal ensuite.
      isRegisteringRef.current = false;
    }
  };

  // ────────────────────────────────────────────────────────────
  // login : se connecter
  // ────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      // signInWithPassword() vérifie l'email + mot de passe auprès
      // de Supabase Auth. Si c'est correct, Supabase :
      //  - renvoie les infos de l'utilisateur (data.user)
      //  - sauvegarde automatiquement une session (token) en local
      //  - déclenche l'event "SIGNED_IN" détecté par onAuthStateChange
      //    ci-dessus (donc "user" sera aussi mis à jour depuis là)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // On met aussi à jour "user" directement ici (en plus du
      // onAuthStateChange) pour que la fonction login() puisse
      // renvoyer immédiatement le résultat à LoginScreen.js sans
      // attendre le prochain "tick" du listener.
      const fullUser = await fetchProfile(data.user);
      setUser(fullUser);

      return { success: true, user: fullUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ────────────────────────────────────────────────────────────
  // logout : se déconnecter
  // ────────────────────────────────────────────────────────────
  const logout = async () => {
    // signOut() supprime la session côté Supabase ET en local.
    // Ça déclenche aussi l'event "SIGNED_OUT" dans onAuthStateChange.
    await supabase.auth.signOut();
    setUser(null);
  };

  // "value" regroupe tout ce qu'on veut rendre disponible aux écrans
  // qui utiliseront useAuth() (ex: LoginScreen, ProfileScreen, etc.)
  const value = {
    user,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!user, // true si user n'est pas null, sinon false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Petit hook personnalisé pour accéder facilement au contexte
// depuis n'importe quel écran, avec : const { user, login } = useAuth();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return context;
};