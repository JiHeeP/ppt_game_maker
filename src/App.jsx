import { useState } from 'react'
import {
  Sparkles, Layout, Trophy, Settings, X, Key, CheckCircle,
  Zap, FileText, Grid, Library, Layers, Target, Settings2,
  ChevronLeft, ChevronRight, History, User, LogOut, Menu, FileUp
} from 'lucide-react'
import { extractTextFromPDF } from './lib/pdfHelper'
import { motion, AnimatePresence } from 'framer-motion'

// Game Engines
import { generateLevelUpPPT } from './lib/gameEngines/levelUpEngine'
import { generateBaseballOxPPT } from './lib/gameEngines/baseballOxEngine'
import { generatePungiyoPPT, generatePungiyoPDF } from './lib/gameEngines/pungiyoEngine'
import { generateTopTenMatchPDF } from './lib/gameEngines/topTenMatchEngine'
import { generateStandardPPT } from './lib/gameEngines/standardEngine'
import { generateTelepathyPPT } from './lib/gameEngines/telepathyEngine'
import { generateGrabPPT } from './lib/gameEngines/grabEngine'
import { generateLandGrabPDF } from './lib/gameEngines/landGrabEngine'
import { generateBingoVerticalPDF, generateBingoVerticalPPT } from './lib/gameEngines/bingoEngine'
import { generateAdvancePDF, generateAdvancePPT } from './lib/gameEngines/advanceEngine'
import { generateQuizQuestions } from './lib/aiService'

import './App.css'

const MotionDiv = motion.div

const MoveIcon = (props) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
);

const GAMES = [
  { id: 1, name: '텔레파시', type: 'PPT', icon: Zap, description: '이심전심 마음을 읽는 선택 퀴즈' },
  { id: 12, name: '뻥이요!', type: 'PPT', icon: Zap, description: '폭탄을 피해 살아남는 스릴 퀴즈' },
  { id: 10, name: '야구골든벨 OX', type: 'PPT', icon: Trophy, description: 'OX 퀴즈를 통한 야구 경기' },
  { id: 4, name: '집어!', type: 'PPT', icon: Target, description: '가장 먼저 정답을 낚아채는 게임' },
  { id: 6, name: '레벨업 골든벨', type: 'PPT', icon: Layers, description: '관문을 통과해 보스에게 도전' },
  { id: 8, name: '땅따먹기', type: 'PDF', icon: Grid, description: '학습지를 채우며 영토를 확장' },
  { id: 9, name: '빙고', type: 'PDF', icon: Grid, description: '수업 키워드로 채우는 빙고 찬스' },
  { id: 11, name: '고고 전진', type: 'PDF', icon: MoveIcon, description: '주사위를 굴려 단계를 넘어가는 전진형' },
  { id: 13, name: '탑텐짝찾기', type: 'PDF', icon: Library, description: '서로 관련있는 카드 짝궁 찾기' },
];

const GRADES = [
  '초등 1-2', '초등 3-4', '초등 5-6', '중학교', '고등학교', '기타'
];

const App = () => {
  const [topic, setTopic] = useState('')
  const [detailedTopic, setDetailedTopic] = useState('')
  const [grade, setGrade] = useState('초등 3-4')
  const [count, setCount] = useState(10)
  const [studentCount, setStudentCount] = useState(Number(localStorage.getItem('student_count')) || 24)
  const [selectedGame, setSelectedGame] = useState(GAMES[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [apiKey, setApiKey] = useState(localStorage.getItem('kimi_api_key') || '')
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || '선생님')
  const [showSettings, setShowSettings] = useState(false)
  // Always consider "key saved" as true if we have a backend key OR a local key. 
  // For simplicity, we'll allow generation to proceed and handle errors from the backend.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('대시보드')
  const [library, setLibrary] = useState(JSON.parse(localStorage.getItem('game_library') || '[]'))
  const [pdfText, setPdfText] = useState('')
  const [pdfData, setPdfData] = useState(null)
  const [pdfName, setPdfName] = useState('')
  const [isPdfLoading, setIsPdfLoading] = useState(false)

  const saveToLibrary = (newRecord) => {
    const updatedLibrary = [newRecord, ...library].slice(0, 20)
    setLibrary(updatedLibrary)
    localStorage.setItem('game_library', JSON.stringify(updatedLibrary))
  }

  const saveProfile = () => {
    localStorage.setItem('kimi_api_key', apiKey)
    localStorage.setItem('user_name', userName)
    localStorage.setItem('student_count', studentCount)
    setShowSettings(false)
    alert('프로필 정보가 저장되었습니다.')
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      return alert('PDF 파일만 업로드 가능합니다.')
    }
    if (file.size > 4 * 1024 * 1024) {
      return alert('PDF 파일 용량이 너무 큽니다. 4MB 이하의 파일만 사용 가능합니다.')
    }

    setIsPdfLoading(true)
    try {
      const text = await extractTextFromPDF(file);
      setPdfText(text);
      setPdfData(null);
      setPdfName(file.name);
      setIsPdfLoading(false);
    } catch (err) {
      console.error(err)
      alert(err.message || 'PDF 업로드 중 오류가 발생했습니다.')
      setIsPdfLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedGame) return alert('게임을 먼저 선택해주세요!')
    if (!topic) return alert('주제를 입력해주세요!')

    // Validation for specific games
    const gameId = selectedGame.id;
    if (gameId === 11 && count < 12) {
      return alert('고고 전진 게임은 최소 12개 이상의 문제가 필요합니다.');
    }
    if (gameId === 8 && count !== 48) {
      return alert('땅따먹기 게임은 반드시 48개의 문제가 필요합니다. (6x8 보드)');
    }
    if (gameId === 13) {
      const requiredCardCount = studentCount * 4;
      const requiredPairCount = requiredCardCount / 2;
      if (count !== requiredPairCount) {
        return alert(`탑텐짝찾기 게임은 현재 학생 수(${studentCount}명) 기준으로 ${requiredCardCount}장의 카드(총 ${requiredPairCount}쌍)가 필요합니다. 문제 수를 ${requiredPairCount}개로 맞춰주세요. (현재: ${count}개)`);
      }
    }

    setIsGenerating(true)
    setLoadingStatus('AI가 수업 주제를 분석하여 최적의 퀴즈를 생성하고 있습니다...')

    try {
      setLoadingStatus('AI가 수업 주제를 분석하여 최적의 퀴즈를 생성하고 있습니다...')

      // Telepathy (id 1) needs 2 questions per round, so we request 2x
      const finalCount = selectedGame.id === 1 ? count * 2 : count;

      // We pass the apiKey (might be empty) - the backend will use its own if ours is empty.
      const topicForModel = detailedTopic ? `${topic} [필수 조건: ${detailedTopic}]` : topic
      const questions = await generateQuizQuestions(apiKey, topicForModel, detailedTopic, finalCount, grade, selectedGame.name, pdfText, pdfData)

      setLoadingStatus(`${selectedGame.name} 파일을 생성하고 있습니다...`)

      // Save to Library
      saveToLibrary({
        id: Date.now(),
        topic,
        questions,
        gameName: selectedGame.name,
        gameId: selectedGame.id,
        grade,
        date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      })

      const gameId = selectedGame.id;

      if (gameId === 9) {
        await generateBingoVerticalPDF(topic, questions);
        await generateBingoVerticalPPT(topic, questions);
      } else if (gameId === 11) {
        await generateAdvancePDF(topic, questions);
        await generateAdvancePPT(topic, questions);
      } else if (gameId === 1) await generateTelepathyPPT(topic, questions);
      else if (gameId === 4) await generateGrabPPT(topic, questions);
      else if (gameId === 10) await generateBaseballOxPPT(topic, questions);
      else if (gameId === 6) await generateLevelUpPPT(topic, questions);
      else if (gameId === 8) await generateLandGrabPDF(topic, questions);
      else if (gameId === 12) {
        await generatePungiyoPPT(topic, questions);
        await generatePungiyoPDF(topic, questions, grade);
      }
      else if (gameId === 13) await generateTopTenMatchPDF(topic, questions);
      else await generateStandardPPT(topic, questions, selectedGame.name);

    } catch (error) {
      console.error(error)
      alert('생성 중 오류 발생: ' + error.message)
    } finally {
      setIsGenerating(false)
      setLoadingStatus('')
    }
  }

  const handleDownload = async (record) => {
    setIsGenerating(true)
    setLoadingStatus(`${record.gameName} 파일을 다시 생성하고 있습니다...`)
    try {
      if (record.gameId === 9) {
        await generateBingoVerticalPDF(record.topic, record.questions);
        await generateBingoVerticalPPT(record.topic, record.questions);
      } else if (record.gameId === 11) {
        await generateAdvancePDF(record.topic, record.questions);
        await generateAdvancePPT(record.topic, record.questions);
      } else if (record.gameId === 1) await generateTelepathyPPT(record.topic, record.questions);
      else if (record.gameId === 2) {
        alert('잠자는 코끼리 게임은 서비스에서 삭제되어 다시 생성할 수 없습니다.');
        return;
      }
      else if (record.gameId === 4) await generateGrabPPT(record.topic, record.questions);
      else if (record.gameId === 10) await generateBaseballOxPPT(record.topic, record.questions);
      else if (record.gameId === 6) await generateLevelUpPPT(record.topic, record.questions);
      else if (record.gameId === 8) await generateLandGrabPDF(record.topic, record.questions);
      else if (record.gameId === 12) {
        await generatePungiyoPPT(record.topic, record.questions);
        await generatePungiyoPDF(record.topic, record.questions, record.grade);
      }
      else if (record.gameId === 13) await generateTopTenMatchPDF(record.topic, record.questions);
      else await generateStandardPPT(record.topic, record.questions, record.gameName);
    } catch (error) {
      console.error(error)
      alert('다운로드 중 오류 발생: ' + error.message)
    } finally {
      setIsGenerating(false)
      setLoadingStatus('')
    }
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><Sparkles size={24} /></div>
          {!sidebarCollapsed && <span className="sidebar-title">PPT MAKER</span>}
        </div>

        <nav className="nav-menu">
          {[
            { id: '대시보드', icon: Layout },
            { id: '나의 게임 보관함', icon: Library }
          ].map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={22} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.id}</span>}
            </div>
          ))}
        </nav>

        <div className="nav-menu" style={{ flex: 0 }}>
          <div className="nav-item" onClick={() => setShowSettings(true)}>
            <User size={22} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>{userName}</span>}
          </div>
        </div>

        <div className="collapse-toggle">
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="app-header">
          <div className="page-title">
            <h1>AI 게임 생성기</h1>
            <p>선생님의 수업 주제 하나면 충분합니다.</p>
          </div>
          <div className="action-panel">
            <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.5rem', cursor: 'pointer', position: 'relative' }}>
              {isPdfLoading ? (
                <div className="loading-circle" style={{ width: 18, height: 18, border: '2px solid var(--slate-400)', borderTopColor: 'transparent' }} />
              ) : (
                <FileUp size={20} />
              )}
              <span style={{ fontWeight: 600 }}>{pdfName ? (pdfName.length > 10 ? pdfName.substring(0, 10) + '...' : pdfName) : '참고 자료 PDF'}</span>
              <input type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
              {pdfName && (
                <button
                  onClick={(e) => { e.preventDefault(); setPdfText(''); setPdfData(null); setPdfName(''); }}
                  style={{
                    position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </label>
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={isGenerating || !topic}
            >
              <Sparkles size={20} />
              <span>지금 바로 생성하기</span>
            </button>
          </div>
        </header >

        {activeTab === '대시보드' ? (
          <>
            {/* Top Bento Grid Section */}
            <section className="bento-top-row">
              <div className="bento-item">
                <label>대상 학년</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="bento-item">
                <label>학습 주제</label>
                <input
                  type="text"
                  placeholder="단원이나 핵심 키워드 (예: 분수의 연산)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="bento-item">
                <label>문제 수</label>
                <input
                  type="number"
                  value={count || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCount(val === '' ? '' : Number(val));
                  }}
                  onBlur={() => {
                    if (count === '' || count < 1) setCount(10);
                  }}
                  min="1" max="50"
                />
              </div>
              <div className="bento-item bento-item-full">
                <label>상세 요청 사항 (선택)</label>
                <input
                  type="text"
                  placeholder="난이도 조절이나 특정 내용 강조 등 AI에게 전달할 메시지를 적어주세요."
                  value={detailedTopic}
                  onChange={(e) => setDetailedTopic(e.target.value)}
                />
              </div>
            </section>

            {/* Main Selection Area */}
            <main className="main-layout">
              <div className="section-title">
                <Grid size={20} style={{ color: 'var(--accent-orange)' }} />
                <span>게임 유형 선택</span>
              </div>
              <div className="selection-grid">
                {GAMES.map((game, idx) => (
                  <MotionDiv
                    key={game.id}
                    className={`game-card ${selectedGame?.id === game.id ? 'active' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: idx * 0.03,
                      ease: "easeOut"
                    }}
                    onClick={() => setSelectedGame(game)}
                  >
                    <div className="magical-glow"></div>
                    <div className="game-type-badge">{game.type}</div>
                    <div className="card-icon-box">
                      <game.icon size={26} />
                    </div>
                    <div className="card-info">
                      <h3>{game.name}</h3>
                      <p>{game.description}</p>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </main>
          </>
        ) : (
          <div className="library-view">
            <div className="section-title" style={{ marginBottom: '1.5rem' }}>
              <Library size={20} style={{ color: 'var(--accent-orange)' }} />
              <span>보관된 게임 (최근 20건)</span>
            </div>
            {library.length === 0 ? (
              <div className="empty-library">
                <div className="empty-icon"><Library size={48} /></div>
                <p>보관된 게임이 없습니다.<br />대시보드에서 첫 게임을 제작해보세요!</p>
              </div>
            ) : (
              <div className="library-grid">
                {library.map((item) => (
                  <MotionDiv
                    key={item.id}
                    className="library-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="item-info">
                      <div className="item-meta">
                        <span className="item-date">{item.date}</span>
                        <span className="item-grade">{item.grade}</span>
                      </div>
                      <h3 className="item-topic">{item.topic}</h3>
                      <p className="item-game">{item.gameName}</p>
                    </div>
                    <button className="btn-download-sm" onClick={() => handleDownload(item)}>
                      <Sparkles size={16} /> 다시 다운로드
                    </button>
                  </MotionDiv>
                ))}
              </div>
            )}
          </div>
        )}
      </main >

      {/* Loading Overlay */}
      < AnimatePresence >
        {isGenerating && (
          <MotionDiv className="loading-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="loading-circle"></div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{loadingStatus || '생성 중...'}</p>
          </MotionDiv>
        )}
      </AnimatePresence >

      {/* Settings Modal */}
      < AnimatePresence >
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <MotionDiv
              className="modal-card"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setShowSettings(false)}><X size={24} /></button>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800 }}>
                <User size={24} color="var(--accent-orange)" /> 프로필 설정
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>사용자 이름</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    style={{ width: '100%', padding: '1.1rem', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--primary)', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 600 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>학급 학생 수</label>
                  <input
                    type="number"
                    value={studentCount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentCount(val === '' ? '' : Number(val));
                    }}
                    onBlur={() => {
                      if (studentCount === '' || studentCount < 1) setStudentCount(24);
                    }}
                    placeholder="학생 수를 입력하세요"
                    style={{ width: '100%', padding: '1.1rem', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--primary)', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 600 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>Kimi API Key</label>
                  <div style={{ padding: '1.1rem', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--success)', border: '1px solid var(--success)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} />
                    <span>시스템에 설정된 API 키를 사용합니다</span>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="별도의 API Key를 사용하려면 입력하세요 (선택)"
                    style={{ width: '100%', padding: '1.1rem', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--primary)', border: '1px solid rgba(0,0,0,0.1)', fontWeight: 600 }}
                  />
                </div>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  입력하지 않으면 서버에 설정된 공용 키가 사용됩니다.
                </p>
                <button className="btn-generate" onClick={saveProfile} style={{ width: '100%', justifyContent: 'center', padding: '1.2rem' }}>저장하기</button>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence >
    </div >
  )
}

export default App
