# ALL IS WELL - 일정 관리 앱

## 실행 방법

### ⚠️ 중요: CORS 오류 해결

이 앱은 ES6 모듈을 사용하므로 **로컬 서버**를 통해 실행해야 합니다.

#### 방법 1: Python 사용 (가장 간단)

1. Python이 설치되어 있는지 확인:
   ```bash
   python --version
   ```

2. 프로젝트 폴더에서 서버 실행:
   ```bash
   python -m http.server 8000
   ```

3. 브라우저에서 접속:
   ```
   http://localhost:8000
   ```

#### 방법 2: Node.js 사용

1. Node.js가 설치되어 있는지 확인:
   ```bash
   node --version
   ```

2. http-server 설치 (한 번만):
   ```bash
   npm install -g http-server
   ```

3. 프로젝트 폴더에서 서버 실행:
   ```bash
   http-server -p 8000
   ```

4. 브라우저에서 접속:
   ```
   http://localhost:8000
   ```

#### 방법 3: VS Code Live Server (권장)

1. VS Code에서 "Live Server" 확장 설치
2. `index.html` 파일에서 우클릭 → "Open with Live Server"

## Firebase 설정

1. Firebase Console에서 프로젝트 생성
2. `firebase-config.js` 파일에 설정값 입력
3. Authentication에서 Email/Password 활성화
4. Firestore Database 생성 및 보안 규칙 설정

## 기능

- ✅ 회원가입/로그인
- ✅ 테스트 계정 자동 생성
- ✅ 일정 추가/수정/삭제
- ✅ 카테고리 관리
- ✅ 월별 목표 설정
- ✅ 집중도 그래프 (원그래프)
- ✅ 달력 보기
- ✅ 실시간 데이터 동기화

