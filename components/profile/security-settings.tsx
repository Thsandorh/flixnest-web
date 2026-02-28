'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import LoadingSpinerBtn from '../loading/loading-spiner-btn';
import { IoShieldCheckmark, IoEye, IoEyeOff, IoCheckmark, IoClose } from 'react-icons/io5';
import AuthServices from 'services/auth-services';

interface SecuritySettingsProps {
  user: any;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SecuritySettings({ user }: SecuritySettingsProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');

  const handleCancel = () => {
    setIsChangingPassword(false);
    reset();
    setShowPasswords({ current: false, new: false, confirm: false });
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthServices.changePassword({
        userId: user.id,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.code || 'auth/invalid-credential');
      }

      toast.success('Password changed successfully');
      handleCancel();
    } catch (error: any) {
      let errorMessage = 'An error occurred while changing your password';
      if (error.message === 'auth/invalid-credential') {
        errorMessage = 'Current password is incorrect';
      } else if (error.message === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Account security</h2>
        {!isChangingPassword && (
          <button
            onClick={() => {
              setIsChangingPassword(true);
              reset();
            }}
            className="px-4 py-2 bg-custome-red text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Change password
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <IoShieldCheckmark className="text-green-400" size={20} />
            <h3 className="text-white font-medium">Password</h3>
          </div>
          <p className="text-gray-400 text-sm">Your account is protected with a password</p>
        </div>

        <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <IoShieldCheckmark className="text-green-400" size={20} />
            <h3 className="text-white font-medium">Two-factor authentication</h3>
          </div>
          <p className="text-gray-400 text-sm">Not enabled</p>
        </div>
      </div>

      {isChangingPassword && (
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-white font-medium mb-4">Change password</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-gray-300 mb-2">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  className={`w-full p-3 pr-12 border ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-600'
                  } bg-black text-white focus:outline-none focus:ring-2 ${
                    errors.currentPassword ? 'focus:ring-red-500' : 'focus:ring-custome-red'
                  } rounded-lg`}
                  {...register('currentPassword', { required: 'Current password is required' })}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.current ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-gray-300 mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  className={`w-full p-3 pr-12 border ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-600'
                  } bg-black text-white focus:outline-none focus:ring-2 ${
                    errors.newPassword ? 'focus:ring-red-500' : 'focus:ring-custome-red'
                  } rounded-lg`}
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.new ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  className={`w-full p-3 pr-12 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  } bg-black text-white focus:outline-none focus:ring-2 ${
                    errors.confirmPassword ? 'focus:ring-red-500' : 'focus:ring-custome-red'
                  } rounded-lg`}
                  {...register('confirmPassword', {
                    required: 'Password confirmation is required',
                    validate: (value) => value === newPassword || 'Password confirmation does not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.confirm ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-custome-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <LoadingSpinerBtn />
                ) : (
                  <>
                    <IoCheckmark size={16} />
                    <span>Change password</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <IoClose size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

