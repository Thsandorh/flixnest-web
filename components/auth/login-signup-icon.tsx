import { CgProfile } from 'react-icons/cg';
import { useAuthModel } from '../context/auth-modal-context';

export default function LoginSignUpIcon() {
  const { openAuthModal } = useAuthModel();
  return (
    <button
      type="button"
      className="tv-icon-button inline-flex items-center justify-center rounded-full px-3 text-white hover:text-custome-red"
      onClick={() => openAuthModal()}
      aria-label="Open account sign in"
    >
      <CgProfile size={25} />
    </button>
  );
}
