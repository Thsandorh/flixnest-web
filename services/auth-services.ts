import { signUpValidationSchemaType } from 'schemas/signup-validation-schema';
import { LoginValidationSchemaType } from 'schemas/login-validation-schema';

const AuthServices = {
  signUp: async (data: signUpValidationSchemaType) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return res;
  },

  login: async (data: LoginValidationSchemaType) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return res;
  },

  setAuthCookie: async (data: any) => {
    const res = await fetch('/api/auth/set-auth-cookie', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return res;
  },

  updateProfile: async (data: { userId: string; name: string; email: string; photo?: string }) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res;
  },

  changePassword: async (data: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res;
  },

  removeAuthCookie: async () => {
    const res = await fetch('/api/auth/remove-auth-cookie');
    return res;
  },
};

export default AuthServices;
