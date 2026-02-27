'use client';

import { createContext, useContext } from 'react';
import { LoginValidationSchemaType } from 'schemas/login-validation-schema';
import getFriendlyErrorMessage from 'utils/get-friendly-error-message';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/slices/user-slice';
import { toast } from 'react-toastify';
import AuthServices from 'services/auth-services';

const AuthContext = createContext<undefined | AuthContextValueType>(undefined);

interface AuthContextValueType {
  login: (data: LoginValidationSchemaType) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  const login = async (data: LoginValidationSchemaType) => {
    try {
      const loginResponse = await AuthServices.login(data);
      const loginPayload = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginPayload?.code || 'auth/invalid-credential');
      }

      const userAccountInfo = loginPayload.user;
      await AuthServices.setAuthCookie({
        accessToken: userAccountInfo.accessToken,
        refreshToken: userAccountInfo.refreshToken,
      });

      dispatch(setUser(userAccountInfo));
      return true;
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error.message));
      return false;
    }
  };

  const loginWithGoogle = async () => {
    toast.info('Google login SQL modban nincs engedelyezve.');
    return false;
  };

  const AuthContextValue: AuthContextValueType = {
    login,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={AuthContextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

