// Firebase 및 인증 모듈 import
import { db } from './firebase-config.js';
import { 
  signUp, 
  signIn, 
  logout, 
  setupAuthStateListener, 
  getCurrentUser,
  changePassword
} from './auth.js';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let currentUser = null;
let userCategories = [];
let selectedDate = new Date();
let viewingMonth = new Date();
let tasksCache = {}; // 날짜별 일정 캐시
let tasksListeners = {}; // 실시간 리스너 관리
let editingTaskId = null;
let editingTaskDateKey = null;
let editingCategoryId = null;

// 날짜를 키로 변환 (YYYY-MM-DD)
function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 키를 날짜로 변환
function keyToDate(key) {
  return new Date(key + 'T00:00:00');
}

// 로그인/회원가입 화면 초기화
function initAuthScreen() {
  const authScreen = document.getElementById('authScreen');
  const loginForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signUpForm');
  const showSignUp = document.getElementById('showSignUp');
  const showLogin = document.getElementById('showLogin');
  const loginTab = document.getElementById('loginTab');
  const signUpTab = document.getElementById('signUpTab');

  // 로그인 폼 제출
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.textContent = '';
    const result = await signIn(email, password);
    
    if (result.success) {
      // 로그인 성공
      console.log('로그인 성공');
      errorDiv.textContent = '로그인 성공!';
      errorDiv.style.color = '#00B894';
      
      // 인증 상태 리스너가 자동으로 앱 초기화하지만, 명시적으로도 확인
      await new Promise(resolve => setTimeout(resolve, 500));
      let user = getCurrentUser();
      
      if (!user) {
        // 인증 상태 리스너가 아직 업데이트하지 않았다면 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
        user = getCurrentUser();
      }
      
      if (user) {
        await initApp();
      } else {
        console.error('사용자 정보를 가져올 수 없습니다.');
        errorDiv.textContent = '사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
        errorDiv.style.color = '#E74C3C';
      }
    } else {
      errorDiv.textContent = result.error;
      errorDiv.style.color = '#E74C3C';
    }
  });

  // 테스트 계정으로 시작하기
  const testAccountBtn = document.getElementById('testAccountBtn');
  if (testAccountBtn) {
    testAccountBtn.addEventListener('click', async () => {
      const errorDiv = document.getElementById('loginError');
      const existingCredentials = document.querySelector('.test-account-credentials');
      if (existingCredentials) {
        existingCredentials.remove();
      }
      
      errorDiv.textContent = '';
      testAccountBtn.disabled = true;
      testAccountBtn.textContent = '계정 생성 중...';
      
      // 테스트 계정 정보 (랜덤 생성)
      const timestamp = Date.now();
      const testEmail = `test${timestamp}@test.com`;
      const testPassword = 'test123456';
      const testName = `테스트${timestamp.toString().slice(-4)}`;
      
      try {
        // 먼저 로그인 시도
        let result = await signIn(testEmail, testPassword);
        
        // 로그인 실패 시 회원가입
        if (!result.success) {
          result = await signUp(testEmail, testPassword, testName);
          
          if (result.success) {
            // 회원가입 성공 - 인증 상태 리스너가 자동으로 앱 초기화
            errorDiv.textContent = '테스트 계정이 생성되었습니다!';
            errorDiv.style.color = '#00B894';
            
            // 로그인 정보 표시
            setTimeout(() => {
              const infoDiv = document.createElement('div');
              infoDiv.className = 'test-account-credentials';
              infoDiv.innerHTML = `
                <p style="margin: 10px 0; font-size: 0.9rem; color: #636E72;">
                  <strong>테스트 계정 정보:</strong><br>
                  이메일: ${testEmail}<br>
                  비밀번호: ${testPassword}
                </p>
                <p style="font-size: 0.8rem; color: #95A5A6;">
                  이 정보로 나중에 로그인할 수 있습니다
                </p>
              `;
              errorDiv.parentElement.insertBefore(infoDiv, errorDiv.nextSibling);
            }, 500);
            
            // 인증 상태 리스너가 자동으로 앱 초기화하지만, 명시적으로도 확인
            // Firebase 인증 상태 변경은 약간의 지연이 있을 수 있으므로 대기
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 인증 상태 확인 후 앱 초기화
            let user = getCurrentUser();
            
            if (!user) {
              // 인증 상태 리스너가 아직 업데이트하지 않았다면 재시도
              await new Promise(resolve => setTimeout(resolve, 500));
              user = getCurrentUser();
            }
            
            if (user) {
              await initApp();
            } else {
              console.error('테스트 계정 사용자 정보를 가져올 수 없습니다.');
              errorDiv.textContent = '사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
              errorDiv.style.color = '#E74C3C';
            }
          } else {
            errorDiv.textContent = result.error || '테스트 계정 생성에 실패했습니다.';
            errorDiv.style.color = '#E74C3C';
            testAccountBtn.disabled = false;
            testAccountBtn.textContent = '테스트 계정으로 시작하기';
          }
        } else {
          // 로그인 성공 - 인증 상태 리스너가 자동으로 앱 초기화
          errorDiv.textContent = '기존 테스트 계정으로 로그인했습니다!';
          errorDiv.style.color = '#00B894';
          
          // 인증 상태 리스너가 자동으로 앱 초기화하지만, 명시적으로도 확인
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let user = getCurrentUser();
          
          if (!user) {
            // 인증 상태 리스너가 아직 업데이트하지 않았다면 재시도
            await new Promise(resolve => setTimeout(resolve, 500));
            user = getCurrentUser();
          }
          
          if (user) {
            await initApp();
          } else {
            console.error('기존 테스트 계정 사용자 정보를 가져올 수 없습니다.');
            errorDiv.textContent = '사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
            errorDiv.style.color = '#E74C3C';
          }
        }
      } catch (error) {
        console.error('테스트 계정 생성 오류:', error);
        errorDiv.textContent = '테스트 계정 생성 중 오류가 발생했습니다.';
        errorDiv.style.color = '#E74C3C';
        testAccountBtn.disabled = false;
        testAccountBtn.textContent = '테스트 계정으로 시작하기';
      }
    });
  }

  // 회원가입 폼 제출
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpName').value;
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const errorDiv = document.getElementById('signUpError');
    
    errorDiv.textContent = '';
    const result = await signUp(email, password, name);
    
    if (result.success) {
      // 회원가입 성공
      console.log('회원가입 성공');
      errorDiv.textContent = '회원가입이 완료되었습니다!';
      errorDiv.style.color = '#00B894';
      
      // 인증 상태 리스너가 자동으로 앱 초기화하지만, 명시적으로도 확인
      await new Promise(resolve => setTimeout(resolve, 500));
      let user = getCurrentUser();
      
      if (!user) {
        // 인증 상태 리스너가 아직 업데이트하지 않았다면 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
        user = getCurrentUser();
      }
      
      if (user) {
        await initApp();
      } else {
        console.error('회원가입 후 사용자 정보를 가져올 수 없습니다.');
        errorDiv.textContent = '사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
        errorDiv.style.color = '#E74C3C';
      }
    } else {
      errorDiv.textContent = result.error;
      errorDiv.style.color = '#E74C3C';
    }
  });

  // 탭 전환
  showSignUp.addEventListener('click', (e) => {
    e.preventDefault();
    loginTab.classList.remove('active');
    signUpTab.classList.add('active');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signUpTab.classList.remove('active');
    loginTab.classList.add('active');
  });
}

// 화면 전환
function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'none';
}

function showAppScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('loadingScreen').style.display = 'none';
}

function showLoadingScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
}

// 앱 초기화
async function initApp() {
  console.log('initApp 호출됨');
  showLoadingScreen();
  
  // currentUser를 다시 확인
  currentUser = getCurrentUser();
  console.log('currentUser:', currentUser);
  
  if (!currentUser) {
    console.log('currentUser가 없습니다. 인증 상태를 기다립니다...');
    // 인증 상태 리스너가 업데이트할 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 500));
    currentUser = getCurrentUser();
    
    if (!currentUser) {
      console.log('currentUser가 여전히 없습니다.');
      showAuthScreen();
      return;
    }
  }
  
  try {
    await loadUserData();
    setupEventListeners();
    await renderCalendar();
    updateSelectedDate(new Date());
    
    showAppScreen();
    console.log('앱 화면 표시 완료');
  } catch (error) {
    console.error('앱 초기화 오류:', error);
    showAuthScreen();
  }
}

// 사용자 데이터 로드
async function loadUserData() {
  await Promise.all([
    loadAppTitle(),
    loadCategories(),
    loadMonthlyGoal()
  ]);
}

// 앱 제목 로드
async function loadAppTitle() {
  if (!currentUser) return;
  
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const title = userData.appTitle || 'ALL IS WELL 🌱';
    document.getElementById('appTitle').textContent = title;
    document.title = title;
  }
}

// 앱 제목 저장
async function saveAppTitle() {
  if (!currentUser) return;
  
  let title = document.getElementById('titleInput').value.trim();
  
  // 새싹 이모지가 없으면 추가
  if (title && !title.includes('🌱')) {
    title = title + ' 🌱';
  }
  
  title = title || 'ALL IS WELL 🌱';
  
  await updateDoc(doc(db, 'users', currentUser.uid), {
    appTitle: title
  });
  
  document.getElementById('appTitle').textContent = title;
  document.title = title;
}

// 제목 편집 모드 활성화
function enableTitleEdit() {
  const titleEl = document.getElementById('appTitle');
  const inputEl = document.getElementById('titleInput');
  const editBtn = document.getElementById('editTitleBtn');
  
  const currentTitle = titleEl.textContent;
  inputEl.value = currentTitle;
  
  titleEl.style.display = 'none';
  editBtn.style.display = 'none';
  inputEl.style.display = 'block';
  inputEl.focus();
  inputEl.select();
}

// 제목 편집 모드 비활성화 및 저장
function disableTitleEdit() {
  saveAppTitle();
  
  const titleEl = document.getElementById('appTitle');
  const inputEl = document.getElementById('titleInput');
  const editBtn = document.getElementById('editTitleBtn');
  
  inputEl.style.display = 'none';
  titleEl.style.display = 'block';
  editBtn.style.display = 'flex';
}

// 카테고리 로드
async function loadCategories() {
  if (!currentUser) return;
  
  const categoriesRef = collection(db, 'users', currentUser.uid, 'categories');
  const snapshot = await getDocs(query(categoriesRef, orderBy('order')));
  
  userCategories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  renderCategories();
}

// 카테고리 렌더링
function renderCategories() {
  const taskCategorySelect = document.getElementById('taskCategory');
  taskCategorySelect.innerHTML = '<option value="">카테고리 선택</option>';
  
  userCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.emoji ? `${category.emoji} ${category.name}` : category.name;
    taskCategorySelect.appendChild(option);
  });
  
  renderCategoryManagerList();
}

// 카테고리 관리자 리스트 렌더링
function renderCategoryManagerList() {
  const managerList = document.getElementById('categoryManagerList');
  if (!managerList) return;
  
  managerList.innerHTML = '';
  userCategories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-manager-item';
    item.innerHTML = `
      <div class="category-manager-info">
        <div class="category-manager-color" style="background: ${category.color}"></div>
        <span class="category-manager-name">${category.emoji ? category.emoji + ' ' : ''}${category.name}</span>
      </div>
      <div class="category-manager-actions">
        <button class="category-manager-btn" onclick="editCategoryFromManager('${category.id}')" title="수정">✏️</button>
        <button class="category-manager-btn" onclick="deleteCategoryFromManager('${category.id}')" title="삭제">🗑️</button>
      </div>
    `;
    managerList.appendChild(item);
  });
}

// 카테고리 저장 중 플래그
let isSavingCategory = false;

// 카테고리 저장
async function saveCategory() {
  if (!currentUser) return;
  
  // 중복 저장 방지
  if (isSavingCategory) {
    console.log('이미 저장 중입니다.');
    return;
  }
  
  isSavingCategory = true;
  
  try {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value || '#6C5CE7';
    
    if (!name) {
      alert('카테고리 이름을 입력해주세요.');
      isSavingCategory = false;
      return;
    }
    
    const categoriesRef = collection(db, 'users', currentUser.uid, 'categories');
    
    if (editingCategoryId) {
      // 수정
      await updateDoc(doc(categoriesRef, editingCategoryId), {
        name,
        color
      });
    } else {
      // 추가 - 중복 확인
      const existingCategory = userCategories.find(c => c.name === name);
      if (existingCategory) {
        alert('이미 존재하는 카테고리입니다.');
        isSavingCategory = false;
        return;
      }
      
      const maxOrder = userCategories.length > 0 
        ? Math.max(...userCategories.map(c => c.order || 0)) 
        : -1;
      await addDoc(categoriesRef, {
        name,
        color,
        order: maxOrder + 1
      });
    }
    
    await loadCategories();
    closeCategoryModal();
  } catch (error) {
    console.error('카테고리 저장 오류:', error);
    alert('카테고리 저장 중 오류가 발생했습니다.');
  } finally {
    isSavingCategory = false;
  }
}

// 카테고리 삭제
async function deleteCategoryFromManager(categoryId) {
  if (!currentUser) return;
  
  if (confirm('카테고리를 삭제하시겠습니까? 이 카테고리를 사용하는 일정도 삭제됩니다.')) {
    // 해당 카테고리를 사용하는 모든 일정 삭제
    const dateKeys = Object.keys(tasksCache);
    for (const dateKey of dateKeys) {
      const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
      const tasksRef = collection(dateRef, 'tasks');
      const snapshot = await getDocs(tasksRef);
      
      const deletePromises = [];
      snapshot.forEach(doc => {
        const task = doc.data();
        if (task.categoryId === categoryId) {
          deletePromises.push(deleteDoc(doc.ref));
        }
      });
      
      await Promise.all(deletePromises);
    }
    
    // 카테고리 삭제
    const categoriesRef = collection(db, 'users', currentUser.uid, 'categories');
    await deleteDoc(doc(categoriesRef, categoryId));
    
    await loadCategories();
    renderTasks();
    renderCalendar();
  }
}

// 카테고리 모달 열기/닫기
function openCategoryModal(categoryId = null) {
  editingCategoryId = categoryId;
  const modal = document.getElementById('categoryModal');
  const form = document.getElementById('categoryForm');
  const title = document.getElementById('categoryModalTitle');
  
  // 색상 팔레트 초기화
  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(option => option.classList.remove('selected'));
  
  if (categoryId) {
    const category = userCategories.find(cat => cat.id === categoryId);
    title.textContent = '카테고리 수정';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryColor').value = category.color;
    
    // 선택된 색상 표시
    const selectedOption = document.querySelector(`.color-option[data-color="${category.color}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  } else {
    title.textContent = '카테고리 추가';
    form.reset();
    document.getElementById('categoryColor').value = '#6C5CE7';
    
    // 기본 색상 선택
    const defaultOption = document.querySelector('.color-option[data-color="#6C5CE7"]');
    if (defaultOption) {
      defaultOption.classList.add('selected');
    }
  }
  
  // 색상 팔레트 클릭 이벤트 설정
  setupColorPaletteEvents();
  
  modal.style.display = 'block';
}

// 색상 팔레트 클릭 이벤트 설정
function setupColorPaletteEvents() {
  const colorOptions = document.querySelectorAll('.color-option');
  const colorInput = document.getElementById('categoryColor');
  
  colorOptions.forEach(option => {
    // 기존 이벤트 리스너 제거를 위해 새 요소로 교체
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    // 새 이벤트 리스너 추가
    newOption.addEventListener('click', () => {
      // 모든 선택 해제
      document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
      
      // 선택된 색상 표시
      newOption.classList.add('selected');
      
      // 숨겨진 input에 색상 저장
      const selectedColor = newOption.getAttribute('data-color');
      colorInput.value = selectedColor;
    });
  });
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
  editingCategoryId = null;
  renderCategories();
}

// 비밀번호 변경 모달 열기/닫기
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  document.getElementById('changePasswordForm').reset();
  document.getElementById('changePasswordError').textContent = '';
  modal.style.display = 'block';
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none';
  document.getElementById('changePasswordForm').reset();
  document.getElementById('changePasswordError').textContent = '';
}

// 카테고리 관리자에서 수정
function editCategoryFromManager(categoryId) {
  openCategoryModal(categoryId);
}

// 일정 로드 (특정 날짜)
async function loadDayTasks(dateKey) {
  if (!currentUser) return [];
  
  const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
  const tasksRef = collection(dateRef, 'tasks');
  const snapshot = await getDocs(query(tasksRef, orderBy('createdAt')));
  
  const tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  tasksCache[dateKey] = tasks;
  return tasks;
}

// 일정 실시간 리스너 설정
function setupTaskListener(dateKey) {
  if (!currentUser || tasksListeners[dateKey]) return;
  
  const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
  const tasksRef = collection(dateRef, 'tasks');
  
  tasksListeners[dateKey] = onSnapshot(query(tasksRef, orderBy('createdAt')), (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    tasksCache[dateKey] = tasks;
    
    if (dateKey === dateToKey(selectedDate)) {
      renderTasks();
    }
    
    renderCalendar();
  });
}

// 일정 저장
async function saveTask() {
  if (!currentUser) return;
  
  const title = document.getElementById('taskTitle').value.trim();
  const categoryId = document.getElementById('taskCategory').value;
  const description = document.getElementById('taskDescription').value.trim();
  
  if (!title || !categoryId) {
    alert('제목과 카테고리를 입력해주세요.');
    return;
  }
  
  const dateKey = editingTaskDateKey || dateToKey(selectedDate);
  const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
  const tasksRef = collection(dateRef, 'tasks');
  
  // 날짜 문서 생성 (없으면)
  const dateDoc = await getDoc(dateRef);
  if (!dateDoc.exists()) {
    await setDoc(dateRef, {
      taskCount: 0,
      completedCount: 0
    });
  }
  
  if (editingTaskId) {
    // 수정
    await updateDoc(doc(tasksRef, editingTaskId), {
      title,
      categoryId,
      description,
      updatedAt: serverTimestamp()
    });
  } else {
    // 추가
    await addDoc(tasksRef, {
      title,
      categoryId,
      description,
      completed: false,
      createdAt: serverTimestamp(),
      order: tasksCache[dateKey]?.length || 0
    });
    
    // 카운트 증가
    await updateDoc(dateRef, {
      taskCount: increment(1)
    });
  }
  
  closeTaskModal();
}

// 일정 완료 토글
async function toggleTaskCompletion(taskId, dateKey) {
  if (!currentUser) return;
  
  const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
  const taskRef = doc(collection(dateRef, 'tasks'), taskId);
  
  const taskDoc = await getDoc(taskRef);
  if (!taskDoc.exists()) return;
  
  const currentCompleted = taskDoc.data().completed;
  await updateDoc(taskRef, {
    completed: !currentCompleted,
    completedAt: currentCompleted ? null : serverTimestamp()
  });
  
  // 완료 카운트 업데이트
  const dateDoc = await getDoc(dateRef);
  if (dateDoc.exists()) {
    const completedCount = dateDoc.data().completedCount || 0;
    await updateDoc(dateRef, {
      completedCount: currentCompleted ? completedCount - 1 : completedCount + 1
    });
  }
}

// 일정 삭제
async function deleteTask(taskId, dateKey) {
  if (!currentUser) return;
  
  if (confirm('일정을 삭제하시겠습니까?')) {
    const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
    const taskRef = doc(collection(dateRef, 'tasks'), taskId);
    
    await deleteDoc(taskRef);
    
    // 카운트 감소
    const dateDoc = await getDoc(dateRef);
    if (dateDoc.exists()) {
      const taskCount = dateDoc.data().taskCount || 0;
      await updateDoc(dateRef, {
        taskCount: taskCount > 0 ? taskCount - 1 : 0
      });
    }
  }
}

// 일정 모달 열기/닫기
function openTaskModal(taskId = null, taskDateKey = null) {
  editingTaskId = taskId;
  editingTaskDateKey = taskDateKey || dateToKey(selectedDate);
  
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  const title = document.getElementById('modalTitle');
  const categoryManager = document.getElementById('categoryManager');
  
  categoryManager.style.display = 'none';
  
  if (taskId) {
    const tasks = tasksCache[editingTaskDateKey] || [];
    const task = tasks.find(t => t.id === taskId);
    title.textContent = '일정 수정';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskCategory').value = task.categoryId;
  } else {
    title.textContent = '일정 추가';
    form.reset();
    renderCategories();
  }
  
  modal.style.display = 'block';
}

function closeTaskModal() {
  document.getElementById('taskModal').style.display = 'none';
  document.getElementById('categoryManager').style.display = 'none';
  editingTaskId = null;
  editingTaskDateKey = null;
}

// 일정 렌더링
async function renderTasks() {
  const taskList = document.getElementById('taskList');
  const selectedDateTitle = document.getElementById('selectedDateTitle');
  const dateKey = dateToKey(selectedDate);
  
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()];
  selectedDateTitle.textContent = `${month}월 ${day}일 (${dayOfWeek})`;
  
  // 일정 로드 및 리스너 설정
  await loadDayTasks(dateKey);
  setupTaskListener(dateKey);
  
  const tasks = tasksCache[dateKey] || [];
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<p style="text-align: center; color: #636E72; padding: 40px 20px;">일정이 없습니다.<br><span style="font-size: 0.9rem;">+ 버튼을 눌러 일정을 추가하세요</span></p>';
    return;
  }
  
  tasks.forEach((task) => {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    const category = userCategories.find(cat => cat.id === task.categoryId);
    const categoryColor = category ? category.color : '#636E72';
    
    taskItem.style.borderLeftColor = categoryColor;
    
    taskItem.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTaskCompletion('${task.id}', '${dateKey}')">
      <div class="task-content">
        <div class="task-title">${task.title}</div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        ${category ? `<span class="task-category" style="background: ${categoryColor}20; color: ${categoryColor};">${category.emoji ? category.emoji + ' ' : ''}${category.name}</span>` : ''}
      </div>
      <div class="task-actions">
        <button class="task-btn" onclick="editTask('${task.id}', '${dateKey}')" title="수정">✏️</button>
        <button class="task-btn" onclick="deleteTask('${task.id}', '${dateKey}')" title="삭제">🗑️</button>
      </div>
    `;
    
    taskList.appendChild(taskItem);
  });
}

// 일정 수정
function editTask(taskId, dateKey) {
  openTaskModal(taskId, dateKey);
}

// 월별 목표 로드
async function loadMonthlyGoal() {
  if (!currentUser) return;
  
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const goalKey = `${year}-${String(month).padStart(2, '0')}`;
  
  const goalRef = doc(db, 'users', currentUser.uid, 'monthlyGoals', goalKey);
  const goalDoc = await getDoc(goalRef);
  
  if (goalDoc.exists()) {
    document.getElementById('monthlyGoal').value = goalDoc.data().goal || '';
  } else {
    document.getElementById('monthlyGoal').value = '';
  }
}

// 월별 목표 저장
async function saveMonthlyGoal() {
  if (!currentUser) return;
  
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const goalKey = `${year}-${String(month).padStart(2, '0')}`;
  const goal = document.getElementById('monthlyGoal').value.trim();
  
  const goalRef = doc(db, 'users', currentUser.uid, 'monthlyGoals', goalKey);
  await setDoc(goalRef, {
    year,
    month,
    goal,
    updatedAt: serverTimestamp()
  }, { merge: true });
  
  const btn = document.querySelector('#goalForm .save-btn');
  const originalText = btn.textContent;
  btn.textContent = '저장됨!';
  btn.style.background = '#00B894';
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
    closeGoalModal();
  }, 1000);
}

// 월별 목표 모달 열기/닫기
function openGoalModal() {
  const modal = document.getElementById('goalModal');
  loadMonthlyGoal();
  modal.style.display = 'block';
}

function closeGoalModal() {
  document.getElementById('goalModal').style.display = 'none';
}

// 달력 뷰용 메타데이터 로드 (최적화)
async function loadCalendarMetadata(month) {
  if (!currentUser) return {};
  
  const year = month.getFullYear();
  const monthNum = month.getMonth();
  const firstDay = new Date(year, monthNum, 1);
  const lastDay = new Date(year, monthNum + 1, 0);
  const firstDateKey = dateToKey(firstDay);
  const lastDateKey = dateToKey(lastDay);
  
  const metadata = {};
  
  // 해당 월의 모든 날짜에 대해 기본값 설정
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, monthNum, d);
    const dateKey = dateToKey(date);
    metadata[dateKey] = {
      taskCount: 0,
      completedCount: 0
    };
  }
  
  // Firestore에서 해당 월의 모든 dailyTasks 문서를 한 번에 조회
  // 참고: Firestore는 서브컬렉션의 날짜 범위 쿼리를 직접 지원하지 않으므로
  // 필요한 날짜들만 개별 조회 (최적화: 병렬 처리)
  const dateKeys = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dateKeys.push(dateToKey(new Date(year, monthNum, d)));
  }
  
  // 병렬로 모든 날짜 문서 조회
  const promises = dateKeys.map(dateKey => {
    const dateRef = doc(db, 'users', currentUser.uid, 'dailyTasks', dateKey);
    return getDoc(dateRef);
  });
  
  const docs = await Promise.all(promises);
  
  // 결과 병합
  docs.forEach((dateDoc, index) => {
    const dateKey = dateKeys[index];
    if (dateDoc.exists()) {
      const data = dateDoc.data();
      metadata[dateKey] = {
        taskCount: data.taskCount || 0,
        completedCount: data.completedCount || 0
      };
    }
  });
  
  return metadata;
}

// 달력 렌더링
async function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  const currentMonthYear = document.getElementById('currentMonthYear');
  
  if (!calendarGrid || !currentMonthYear) return;
  
  // 년도와 월 표시
  const year = viewingMonth.getFullYear();
  const month = viewingMonth.getMonth();
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                      '7월', '8월', '9월', '10월', '11월', '12월'];
  currentMonthYear.textContent = `${year}년 ${monthNames[month]}`;
  
  // 달력 그리드 초기화
  calendarGrid.innerHTML = '';
  
  // 요일 헤더 추가
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  dayNames.forEach(dayName => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = dayName;
    calendarGrid.appendChild(dayHeader);
  });
  
  // 해당 월의 첫 번째 날과 마지막 날 계산
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeek = firstDayOfMonth.getDay(); // 0 = 일요일
  const daysInMonth = lastDayOfMonth.getDate();
  
  // 오늘 날짜
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  
  // 빈 셀 추가 (첫 번째 날 이전)
  for (let i = 0; i < firstDayWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyDay);
  }
  
  // 먼저 달력을 렌더링 (메타데이터 없이)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = dateToKey(date);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.setAttribute('data-date', dateKey);
    
    // 오늘인지 확인
    if (day === todayDate && month === todayMonth && year === todayYear) {
      dayElement.classList.add('today');
    }
    
    // 선택된 날짜인지 확인
    if (dateKey === dateToKey(selectedDate)) {
      dayElement.classList.add('selected');
    }
    
    // 날짜 표시 (일정 개수는 나중에 업데이트)
    dayElement.innerHTML = `
      <span class="day-number">${day}</span>
    `;
    
    // 클릭 이벤트
    dayElement.addEventListener('click', () => {
      updateSelectedDate(date);
    });
    
    calendarGrid.appendChild(dayElement);
  }
  
  // 메타데이터를 비동기로 로드하고 업데이트
  loadCalendarMetadata(viewingMonth).then(metadata => {
    // 각 날짜 셀에 일정 개수 업데이트
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = dateToKey(date);
      const meta = metadata[dateKey] || { taskCount: 0 };
      
      const dayElement = calendarGrid.querySelector(`[data-date="${dateKey}"]`);
      if (dayElement && meta.taskCount > 0) {
        const dayNumber = dayElement.querySelector('.day-number');
        if (dayNumber && !dayElement.querySelector('.day-tasks-count')) {
          const taskCountSpan = document.createElement('span');
          taskCountSpan.className = 'day-tasks-count';
          taskCountSpan.textContent = `${meta.taskCount}개`;
          dayElement.appendChild(taskCountSpan);
        } else if (dayElement.querySelector('.day-tasks-count')) {
          dayElement.querySelector('.day-tasks-count').textContent = `${meta.taskCount}개`;
        }
      }
    }
  });
}

// 선택된 날짜 업데이트
function updateSelectedDate(date) {
  selectedDate = new Date(date);
  renderTasks();
  renderCalendar();
}

// 그래프 렌더링 (원그래프)
async function renderChart() {
  const canvas = document.getElementById('focusChart');
  const legendContainer = document.getElementById('chartLegend');
  
  if (!canvas || !legendContainer || !currentUser) return;
  
  const ctx = canvas.getContext('2d');
  const year = viewingMonth.getFullYear();
  const month = viewingMonth.getMonth();
  
  const size = Math.min(canvas.offsetWidth || 350, canvas.offsetHeight || 350);
  canvas.width = size;
  canvas.height = size;
  
  const categoryCounts = {};
  userCategories.forEach(cat => {
    categoryCounts[cat.id] = 0;
  });
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateKey = dateToKey(date);
    
    if (tasksCache[dateKey]) {
      tasksCache[dateKey].forEach(task => {
        if (task.completed && categoryCounts.hasOwnProperty(task.categoryId)) {
          categoryCounts[task.categoryId]++;
        }
      });
    }
  }
  
  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (totalCount === 0) {
    ctx.fillStyle = '#636E72';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('완료된 일정이 없습니다.', canvas.width / 2, canvas.height / 2);
    legendContainer.innerHTML = '';
    return;
  }
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
  let startAngle = -Math.PI / 2;
  
  legendContainer.innerHTML = '';
  
  const chartData = userCategories
    .map(category => ({
      category,
      count: categoryCounts[category.id],
      percentage: totalCount > 0 ? (categoryCounts[category.id] / totalCount * 100) : 0
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
  
  chartData.forEach((item) => {
    const { category, count, percentage } = item;
    const sliceAngle = (count / totalCount) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = category.color;
    ctx.fill();
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    if (sliceAngle > 0.3) {
      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.6);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.6);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage.toFixed(0)}%`, labelX, labelY);
    }
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background: ${category.color}"></div>
      <div class="legend-info">
        <div class="legend-name">${category.emoji ? category.emoji + ' ' : ''}${category.name}</div>
        <div class="legend-count">${count}개 완료</div>
      </div>
      <div class="legend-percentage">${percentage.toFixed(1)}%</div>
    `;
    legendContainer.appendChild(legendItem);
    
    startAngle += sliceAngle;
  });
  
  ctx.fillStyle = '#2D3436';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('총', centerX, centerY - 15);
  ctx.fillStyle = '#636E72';
  ctx.font = '18px sans-serif';
  ctx.fillText(`${totalCount}개`, centerX, centerY + 10);
}

// 그래프 모달 열기/닫기
function openChartModal() {
  const modal = document.getElementById('chartModal');
  modal.style.display = 'block';
  setTimeout(() => {
    renderChart();
  }, 150);
}

function closeChartModal() {
  document.getElementById('chartModal').style.display = 'none';
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 제목 편집
  const titleEl = document.getElementById('appTitle');
  const editBtn = document.getElementById('editTitleBtn');
  const titleInput = document.getElementById('titleInput');
  
  titleEl.addEventListener('dblclick', enableTitleEdit);
  editBtn.addEventListener('click', enableTitleEdit);
  
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      disableTitleEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      titleInput.value = titleEl.textContent;
      disableTitleEdit();
    }
  });
  
  titleInput.addEventListener('blur', disableTitleEdit);
  
  // 월 네비게이션
  document.getElementById('prevMonth').addEventListener('click', async () => {
    viewingMonth.setMonth(viewingMonth.getMonth() - 1);
    await renderCalendar();
    renderChart();
  });
  
  document.getElementById('nextMonth').addEventListener('click', async () => {
    viewingMonth.setMonth(viewingMonth.getMonth() + 1);
    await renderCalendar();
    renderChart();
  });
  
  // 일정 추가
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    openTaskModal();
  });
  
  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveTask();
  });
  
  // 월별 목표
  document.getElementById('goalToggleBtn').addEventListener('click', openGoalModal);
  document.getElementById('goalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveMonthlyGoal();
  });
  
  // 그래프
  document.getElementById('chartBtn').addEventListener('click', openChartModal);
  
  // 카테고리 관리
  document.getElementById('manageCategoryBtn').addEventListener('click', () => {
    const manager = document.getElementById('categoryManager');
    manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
  });
  
  document.getElementById('addCategoryInlineBtn').addEventListener('click', () => {
    openCategoryModal();
  });
  
  document.getElementById('categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveCategory();
  });
  
  // 모달 닫기
  document.getElementById('closeTaskModal').addEventListener('click', closeTaskModal);
  document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
  document.getElementById('closeChartModal').addEventListener('click', closeChartModal);
  document.getElementById('closeGoalModal').addEventListener('click', closeGoalModal);
  document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
  document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelGoalBtn').addEventListener('click', closeGoalModal);
  
  window.addEventListener('click', (e) => {
    const taskModal = document.getElementById('taskModal');
    const categoryModal = document.getElementById('categoryModal');
    const chartModal = document.getElementById('chartModal');
    const goalModal = document.getElementById('goalModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (e.target === taskModal) closeTaskModal();
    if (e.target === categoryModal) closeCategoryModal();
    if (e.target === chartModal) closeChartModal();
    if (e.target === goalModal) closeGoalModal();
    if (e.target === changePasswordModal) closeChangePasswordModal();
  });
  
  // 비밀번호 변경
  document.getElementById('changePasswordBtn').addEventListener('click', () => {
    openChangePasswordModal();
  });

  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('changePasswordError');
    
    errorDiv.textContent = '';
    
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.';
      errorDiv.style.color = '#E74C3C';
      return;
    }
    
    if (newPassword.length < 6) {
      errorDiv.textContent = '비밀번호는 6자 이상이어야 합니다.';
      errorDiv.style.color = '#E74C3C';
      return;
    }
    
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
      errorDiv.textContent = '비밀번호가 변경되었습니다!';
      errorDiv.style.color = '#00B894';
      
      // 폼 초기화
      document.getElementById('changePasswordForm').reset();
      
      setTimeout(() => {
        closeChangePasswordModal();
      }, 1500);
    } else {
      errorDiv.textContent = result.error || '비밀번호 변경에 실패했습니다.';
      errorDiv.style.color = '#E74C3C';
    }
  });

  document.getElementById('closeChangePasswordModal').addEventListener('click', closeChangePasswordModal);
  document.getElementById('cancelChangePasswordBtn').addEventListener('click', closeChangePasswordModal);

  // 로그아웃
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      // 리스너 정리
      Object.values(tasksListeners).forEach(unsubscribe => unsubscribe());
      tasksListeners = {};
      tasksCache = {};
      
      await logout();
      showAuthScreen();
    }
  });
  
  // 창 크기 변경
  window.addEventListener('resize', () => {
    if (document.getElementById('chartModal').style.display === 'block') {
      setTimeout(renderChart, 100);
    }
  });
}

// 전역 함수 (HTML에서 호출)
window.toggleTaskCompletion = toggleTaskCompletion;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.editCategoryFromManager = editCategoryFromManager;
window.deleteCategoryFromManager = deleteCategoryFromManager;

// 앱 시작
initAuthScreen();

// 인증 상태 감지
setupAuthStateListener((user) => {
  if (user) {
    currentUser = user;
    initApp();
  } else {
    currentUser = null;
    showAuthScreen();
  }
});
