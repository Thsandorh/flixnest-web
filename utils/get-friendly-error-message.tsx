export default function getFriendlyErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
      return 'Thong tin dang nhap khong hop le.';
    case 'auth/user-not-found':
      return 'Tai khoan khong ton tai.';
    case 'auth/wrong-password':
      return 'Password khong chinh xac.';
    case 'auth/email-already-in-use':
      return 'Email nay da duoc su dung.';
    case 'auth/invalid-email':
      return 'Dia chi email khong hop le.';
    case 'auth/weak-password':
      return 'Password qua yeu, toi thieu 6 ky tu.';
    default:
      return 'An error occurred. Please try again later.';
  }
}

