export default function getFriendlyErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
      return 'Invalid login credentials.';
    case 'auth/user-not-found':
      return 'Account does not exist.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/weak-password':
      return 'Password is too weak; it must be at least 6 characters.';
    default:
      return 'An error occurred. Please try again later.';
  }
}

