'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuthModel } from '../context/auth-modal-context';
import LoginForm from './login-form';
import SignUpForm from './signup-form';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuthModel();
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [renderSignUpForm, setRenderSignUpForm] = useState<boolean>(false);

  // Disable page scroll when modal is open
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `8px`;
      setShowAnimation(true);
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = `0px`;
      setShowAnimation(false);
      setRenderSignUpForm(false);
    }
    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = `0px`;
    };
  }, [isAuthModalOpen]);

  const renderForm = () => {
    if (renderSignUpForm) {
      return <SignUpForm setRenderSignUpForm={setRenderSignUpForm}/>
    }

    return <LoginForm setRenderSignUpForm={setRenderSignUpForm}/>
  }

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div
        onClick={() => closeAuthModal()}
        className="absolute inset-0 bg-gray-900 bg-opacity-50"
      ></div>
      <div
        className={`bg-black border border-slate-600 rounded-lg p-6 w-96 relative transition-transform duration-300 ${
          showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => closeAuthModal()}
          className="absolute top-2 right-4 text-gray-300 hover:text-white"
        >
          &#x2715;
        </button>
        <div className="flex justify-center mb-4">
          <span className="text-2xl font-extrabold tracking-tight text-custome-red">FLIXNEST</span>
        </div>
        {renderForm()}
      </div>
    </div>
  );
}
