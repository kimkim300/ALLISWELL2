// 인증 관련 함수들
import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 현재 로그인한 사용자
export let currentUser = null;

// 회원가입
export async function signUp(email, password, displayName) {
  try {
    // Firebase Auth로 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Firestore에 사용자 정보 저장 (비밀번호도 저장 - 보안상 권장하지 않음)
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      password: password, // 평문으로 저장 (보안상 권장하지 않음)
      displayName: displayName || email.split('@')[0],
      appTitle: 'ALL IS WELL 🌱',
      createdAt: serverTimestamp()
    });
    
    // 기본 카테고리 생성
    const defaultCategories = [
      { name: '업무', color: '#6C5CE7', order: 0, emoji: '💼' },
      { name: '개인', color: '#00B894', order: 1, emoji: '👤' },
      { name: '건강', color: '#FD79A8', order: 2, emoji: '🏃' },
      { name: '공부', color: '#FDCB6E', order: 3, emoji: '📚' }
    ];
    
    const categoriesRef = collection(db, 'users', user.uid, 'categories');
    const promises = defaultCategories.map(category => addDoc(categoriesRef, category));
    await Promise.all(promises);
    
    return { success: true, user: user };
  } catch (error) {
    console.error('회원가입 오류:', error);
    return { 
      success: false, 
      error: getErrorMessage(error.code) 
    };
  }
}

// 로그인
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('로그인 오류:', error);
    return { 
      success: false, 
      error: getErrorMessage(error.code) 
    };
  }
}

// 로그아웃
export async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    return { success: true };
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return { success: false, error: error.message };
  }
}

// 인증 상태 감지
export function setupAuthStateListener(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 사용자 정보 로드
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        currentUser = {
          uid: user.uid,
          email: user.email,
          ...userDoc.data()
        };
      } else {
        currentUser = {
          uid: user.uid,
          email: user.email
        };
      }
    } else {
      currentUser = null;
    }
    callback(currentUser);
  });
}

// 현재 사용자 정보 가져오기
export function getCurrentUser() {
  return currentUser;
}

// 비밀번호 변경
export async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: '로그인된 사용자가 없습니다.' };
    }

    // 재인증
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // 비밀번호 변경
    await updatePassword(user, newPassword);

    // Firestore에 새 비밀번호 저장 (평문)
    await setDoc(doc(db, 'users', user.uid), {
      password: newPassword
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return { 
      success: false, 
      error: getErrorMessage(error.code) || '비밀번호 변경 중 오류가 발생했습니다.' 
    };
  }
}

// 에러 메시지 변환
function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
    'auth/operation-not-allowed': '이 작업은 허용되지 않습니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
    'auth/user-disabled': '사용할 수 없는 계정입니다.',
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/too-many-requests': '너무 많은 요청이 발생했습니다. 나중에 다시 시도해주세요.'
  };
  
  return errorMessages[errorCode] || '오류가 발생했습니다. 다시 시도해주세요.';
}
