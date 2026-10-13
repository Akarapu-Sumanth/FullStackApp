import {
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { clearAuthTokens } from "../api";
import { AuthContext } from "./contexts";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("access_token")));

  const applyUserFromProfile = (profileData) => {
    const nextUser = profileData?.user
      ? {
          ...profileData.user,
          profile: {
            display_name: profileData.display_name,
            avatar: profileData.avatar,
          },
        }
      : profileData ?? null;

    if (!nextUser) {
      return null;
    }

    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  };

  const refreshSession = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return null;
    }

    try {
      const response = await api.get("/profile/");
      return applyUserFromProfile(response.data);
    } catch {
      clearAuthTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      return undefined;
    }

    let active = true;
    const restoreSession = async () => {
      try {
        const response = await api.get("/profile/");
        if (!active) {
          return;
        }
        const profileData = response.data;
        const nextUser = profileData?.user
          ? {
              ...profileData.user,
              profile: {
                display_name: profileData.display_name,
                avatar: profileData.avatar,
              },
            }
          : profileData ?? null;
        if (nextUser) {
          setUser(nextUser);
          localStorage.setItem("user", JSON.stringify(nextUser));
        }
      } catch {
        if (active) {
          clearAuthTokens();
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (username, password) => {
    const response = await api.post("/auth/login/", {
      username,
      password,
    });

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);

    const profileResponse = await api.get("/profile/");
    const nextUser = applyUserFromProfile(profileResponse.data);

    return nextUser;
  };

  const register = async (username, email, password) => {
    const response = await api.post("/auth/register/", {
      username,
      email,
      password,
    });

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);

    const profileResponse = await api.get("/profile/");
    const nextUser = applyUserFromProfile(profileResponse.data);

    return nextUser;
  };

  const logout = () => {
    clearAuthTokens();
    setUser(null);
    window.location.assign("/login");
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && localStorage.getItem("access_token")),
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
