// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { google_auth } from "./fire_config.js";
import { ref, onValue } from "firebase/database";
import { db } from "./fire_config.js";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import AXIOS from "./Axios_config.js";
import { toast_error, toast_warn, toast_success } from "../utils/Toasts.js";
import { deleteUser } from "firebase/auth";
import { useSocket } from "./SocketContext.js";

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(google_auth, provider);
      const firebaseUser = result.user;

      // verifică userul în backend
      const res = await AXIOS.get(`/api/user/${firebaseUser.uid}`);

      if (!res.data.success || !res.data.user) {
        // dacă userul nu există în backend -> ștergem și din Firebase
        try {
          await deleteUser(firebaseUser);
        } catch (e) {
          // dacă nu putem șterge (ex: e session-only), măcar îl delogăm
          await signUserOut();
        }

        toast_warn(
          "Nu există cont pentru acest email. Înregistrează-te mai întâi."
        );
        return null;
      }

      // dacă userul e valid
      setUser({
        uid: firebaseUser.uid,
        ...res.data.user,
      });

      return res.data.user;
    } catch (error) {
      await signUserOut();
      toast_warn(
        "Nu există cont pentru acest email. Înregistrează-te mai întâi."
      );
      return null;
    }
  };

  const register = async (infos) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(google_auth, provider);
      const {
        accessToken,
        isAnonymous,
        proactiveRefresh,
        providerData,
        providerId,
        reloadListener,
        reloadUserInfo,
        stsTokenManager,
        tenantId,
        auth,
        ...googleData
      } = result.user;

      const res = await AXIOS.post("/api/user", {
        uid: result.user.uid,
        userData: {
          google: { ...googleData },
          ...infos,
          role: "user",
          validate: false,
        },
        preventOverwrite: true,
      });

      if (!res.data.success) {
        if (res.status === 409 || res.data.code === 409) {
          toast_warn("Există deja un cont pentru acest utilizator. Autentifică-te.");
        } else {
          toast_error(res.data.message || "Nu s-a putut crea contul.");
        }
        await signUserOut();
        return null;
      }

      setUser({
        uid: result.user.uid,
        ...res.data.user,
      });

      return res.data.user;
    } catch (error) {
      if (error.response?.status === 409) {
        toast_warn("Există deja un cont pentru acest utilizator. Autentifică-te.");
      } else {
        const errMessage = error.response?.data?.message || error.message || "Eroare necunoscută";
        toast_error(`Google Sign-In Error: ${errMessage}`);
      }
      await signUserOut();
      return null;
    }
  };

  const signUserOut = async () => {
    try {
      await signOut(google_auth);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    const res = await AXIOS.get(`/api/user/${user.uid}`);
    setUser({
      uid: user.uid,
      ...res.data.user,
    });
  };
  const updateUser = async (uid, userData) => {
    if (!user) return null;
    try {
      const res = await AXIOS.post("/api/user", { uid, userData });
      if (res.data.success) {
        setUser({
          uid: user.uid,
          ...res.data.user,
        });
      } else if (res.data?.message) {
        toast_error(res.data.message);
      } else if (res.data?.error) {
        toast_error(res.data.error);
      }
      return res.data;
    } catch (error) {
      toast_error("Nu s-a putut updata profilul");
      return null;
    }
  };

  useEffect(() => {
    let unsubscribeDb = null;

    const unsubscribeAuth = onAuthStateChanged(
      google_auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // validare user în backend
            const res = await AXIOS.get(`/api/user/${firebaseUser.uid}`);
            if (!res.data.success || !res.data.user) {
              // nu există → îl ștergem
              try {
                await deleteUser(firebaseUser);
              } catch {
                await signUserOut();
              }
              setUser(null);
              return;
            }

            // există → îl setăm
            setUser({
              uid: firebaseUser.uid,
              ...res.data.user,
            });

            // activăm și listener la realtime db
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            unsubscribeDb = onValue(userRef, (snapshot) => {
              const liveUser = snapshot.val();
              setUser((prevUser) => ({
                ...prevUser,
                ...liveUser,
              }));
            });
          } catch (err) {
            // fallback: delogare curată
            await signUserOut();
            setUser(null);
          }
        } else {
          setUser(null);
          if (unsubscribeDb) unsubscribeDb();
        }

        setLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) unsubscribeDb();
    };
  }, []);

  // Socket listener pentru actualizări user
  useEffect(() => {
    if (socket && user) {
      const handleUserUpdate = (data) => {
        if (data.userId === user.uid) {
          // Actualizează user-ul local cu noile date
          setUser(prevUser => ({
            ...prevUser,
            ...data.user
          }));
          
          // Afișează notificare pentru schimbări de rol
          if (data.action === "role_changed") {
            if (data.user.role === "admin") {
              toast_success("🎉 Ai fost promovat administrator!");
            } else {
              toast_warn("⚠️ Nu mai ești administrator.");
            }
          } else if (data.action === "reapproval_required") {
            toast_warn(
              "Profilul tău a fost actualizat și este în așteptarea reaprobării."
            );
          } else if (data.action === "profile_updated") {
            toast_success("Profil actualizat.");
          }
        }
      };

      socket.on("userUpdate", handleUserUpdate);

      return () => {
        socket.off("userUpdate", handleUserUpdate);
      };
    }
  }, [socket, user]);

  const value = {
    user,
    loading,
    updateUser,
    register,
    signInWithGoogle,
    signUserOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
