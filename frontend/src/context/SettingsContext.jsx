import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SETTINGS_STORAGE_KEY = 'studyspark:settings:v1';

const defaultSettings = {
  theme: 'system',
  language: 'en',
};

const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_LANGUAGES = ['en', 'hi'];

const UI_TEXT = {
  en: {
    dashboard: 'Dashboard',
    explain: 'Explain a Topic',
    summary: 'Summarize Notes',
    quiz: 'Generate Quiz',
    plan: 'Study Plan',
    history: 'Study History',
    engineReady: 'Engine Ready',
    engineOffline: 'Offline',
    checkingStatus: 'Connecting…',
    languageLabel: 'Current language {lang}. Click to toggle.',
    themeLabel: 'Toggle light or dark theme',
    wakeup: 'Waking up the study engine… this can take up to a minute the first time.',
    localHistoryNote: 'History is stored only in this browser on your device and is never sent to the backend.',
    clearAll: 'Clear all',
    reviewHistory: 'Review your previously generated explanations, summaries, quiz scores, and roadmaps.',
    retry: 'Retry',
    settings: 'Settings',
    assistantTagline: 'Learn Smarter, Not Harder.',
    aiPowered: 'AI-powered study assistant',
    heroTitle: 'Supercharge your study sessions with Gemma 4',
    heroDescription: 'Get explanations, note summaries, interactive quizzes, and study plans tailored to your deadlines.',
    startExplain: 'Explain a Topic',
    buildPlan: 'Build Study Plan',
    studyTools: 'Study Tools',
    interactiveFeatures: '4 Interactive Features',
    toolExplainDescription: 'Clear explanations, examples, and key points for any topic.',
    toolSummaryDescription: 'Distill your notes into key takeaways and vocabulary.',
    toolQuizDescription: 'Test yourself with a five-question interactive quiz.',
    toolPlanDescription: 'Build a realistic schedule around your deadlines.',
    explainDescription: 'Get clear explanations with everyday analogies, examples, and key points.',
    topicOrConcept: 'Topic or Concept',
    topicPlaceholder: "e.g. Photosynthesis, Newton's third law",
    minimum3: 'Minimum 3 characters',
    studentLevel: 'Student Level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    explaining: 'Explaining…',
    explainIt: 'Explain it',
    tryExample: 'Try an example:',
    craftingExplanation: 'Crafting explanation…',
    enterTopic: 'Enter a topic above or tap an example to begin.',
    explanation: 'Explanation',
    realLifeExample: 'Real-life Example',
    keyTakeaways: 'Key Takeaways',
    oneLine: 'In one line:',
    quizOnTopic: 'Quiz me on this topic',
    copy: 'Copy',
    copied: 'Copied!',
    summarizeDescription: 'Extract key points and vocabulary directly from your study material.',
    studyNotes: 'Study Notes or Article',
    notesPlaceholder: 'Paste your notes here (50 to 8000 characters)…',
    needs50: 'Needs at least 50 characters',
    over8000: 'Exceeds 8000 character limit',
    charRange: '50–8000 characters',
    shortenNotes: 'Please shorten your notes to 8000 characters.',
    summaryDepth: 'Summary Depth',
    shortRecap: 'Short (Quick Recap)',
    mediumDetailed: 'Medium (In-depth)',
    summarizing: 'Summarizing…',
    summarize: 'Summarize',
    synthesizing: 'Synthesizing notes…',
    pasteNotes: 'Paste lecture notes or textbook excerpts above to distill them.',
    notesSummary: 'Notes Summary',
    corePoints: 'Core Points',
    keyVocabulary: 'Key Vocabulary',
    quizFromSummary: 'Generate quiz from this summary',
    quizDescription: 'Create an interactive five-question test with explanations.',
    topicOrMaterial: 'Topic or Pasted Material',
    quizPlaceholder: 'Enter a topic or paste notes to test on…',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    generatingQuiz: 'Generating quiz…',
    generateQuiz: 'Generate quiz',
    draftingQuestions: 'Drafting 5 questions…',
    launchQuiz: 'Type a topic or paste study notes to launch your quiz.',
    question: 'Question',
    of: 'of',
    checkAnswer: 'Check answer',
    nextQuestion: 'Next question →',
    seeResults: 'See results 🎉',
    quizCompleted: 'Quiz Completed',
    outstanding: '🎉 Outstanding! Perfect score!',
    solidWork: '👍 Solid work! Keep reinforcing key concepts.',
    reviewAnswers: '📚 Review the explanations below and try again!',
    retakeQuiz: 'Retake quiz',
    newQuiz: 'New quiz',
    questionReview: 'Question Review',
    correctAnswer: 'Correct Answer:',
    yourAnswer: 'Your Answer:',
    why: 'Why:',
    explanationLabel: 'Explanation:',
    planDescription: 'Create an achievable day-by-day timetable balanced around your deadlines and available study hours.',
    subjects: 'Subjects (1 to 6)',
    subject: 'Subject',
    subjectName: 'Subject Name *',
    subjectPlaceholder: 'e.g. Physics, Chemistry, World History',
    targetDeadline: 'Target Deadline (Optional)',
    topicsChapters: 'Specific Topics or Chapters (Optional)',
    topicsPlaceholder: 'e.g. Thermodynamics, Waves, Optics',
    removeSubject: 'Remove subject',
    addSubject: 'Add another subject',
    dailyStudyHours: 'Daily Study Hours',
    hoursPerDay: 'hours / day (0.5 to 12)',
    startDate: 'Start Date',
    creatingPlan: 'Creating plan…',
    createPlan: 'Create my plan',
    sequencingPlan: 'Sequencing optimal study days…',
    configurePlan: 'Configure your subjects and daily hours above to generate your study timetable.',
    personalizedRoadmap: 'Personalized Roadmap',
    dayStudyPlan: '{days}-Day Study Plan',
    copyAsText: 'Copy as text',
    truncatedPlan: 'Showing the first 14 days of your timeline. Generate again later for upcoming deadlines.',
    sessionProgress: 'Session Progress',
    sessionsDone: '{done} of {total} done ({percent}%)',
    dailySchedule: 'Daily Schedule',
    dayNumber: 'Day {day}',
    totalMinutes: '{minutes} mins total',
    restDay: 'Rest Day',
    restDayMessage: 'Rest day 🌿 Take time to recharge and consolidate memory.',
    studyTips: 'Study Strategies & Tips',
    quizzesTaken: 'Quizzes Taken',
    bestScore: 'Best Score',
    averageScore: 'Average Score',
    roadmaps: 'Roadmaps',
    all: 'All',
    explainTab: 'Explain',
    summaryTab: 'Summary',
    quizTab: 'Quiz',
    planTab: 'Plan',
    explanationType: 'Explanation',
    summaryType: 'Summary',
    planType: 'Study Plan',
    loadDemo: 'Load Demo Data',
    deleteItems: 'Delete all {count} items?',
    deleteYes: 'Yes, delete',
    cancel: 'Cancel',
    viewingSaved: 'Viewing Saved {type}',
    closeView: 'Close view',
    nothingSaved: 'Nothing saved yet in {type}.',
    localDataWarning: 'Your study history may include personal notes or results. It is stored only in this browser on this device and is never sent to the backend.',
    couldNotExplain: 'Could not explain this topic. Please try again.',
    couldNotSummarize: 'Could not summarize notes. Please try again.',
    couldNotGenerateQuiz: 'Could not generate quiz. Please try again.',
    couldNotCreatePlan: 'Could not create study plan. Please try again.',
    aiEngineStatus: 'AI Engine Status',
    refresh: 'Refresh',
    checking: 'Checking…',
    backendApi: 'Backend API',
    online: 'Online (200)',
    modelTarget: 'Model Target',
    aiConfigured: 'AI Configured',
    yesKeySet: 'Yes (Key Set)',
    noPendingKey: 'No (Pending Key)',
    specVersion: 'Spec Version',
    quizMe: 'Quiz me on this',
    emptyHistory: 'Nothing here yet — try a tool and your results will appear here.',
    open: 'Open',
    hide: 'Hide',
    deleteItem: 'Delete item',
    savedSession: 'Saved study session',
    historyEmptyDescription: 'Your generated explanations, summaries, quizzes, and study plans will appear here automatically.',
    startLearning: 'Start learning now',
    loadSampleData: 'Load sample data',
    allHistory: 'history',
    itemDeleted: 'Item deleted',
    clearHistory: 'Clear history',
    localHistoryTitle: 'History is stored locally',
    errorValidation: 'Please check the information you entered and try again.',
    errorUnsuitable: 'That input could not be used. Please try a study topic or notes.',
    errorRateLimited: 'The study engine is busy. Please wait a moment and try again.',
    errorModelInvalid: 'The study engine could not format a valid answer. Please try again.',
    errorModelUnavailable: 'The study engine is temporarily unavailable. Please try again later.',
    errorTimeout: 'The request took too long. Please try again.',
    errorNetwork: 'Cannot connect to the StudySpark server. Check your connection and try again.',
    errorGeneric: 'Something went wrong. Please try again.',
    aiKeyMissing: 'AI key is not configured',
    toggleLanguage: 'Toggle output language between English and Hindi',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    thinking: 'Thinking…',
    findingWords: 'Finding simple words…',
    organizingPoints: 'Organizing key points…',
    almostThere: 'Almost there…',
    tailoringResponse: 'Gemma is tailoring your response.',
    somethingWrong: 'Something went wrong',
    tryAgain: 'Try again',
    readyToLearn: 'Ready to learn',
    fillForm: 'Fill out the form above to generate your study material.',
    safetyFooter: "AI can be wrong — verify important facts. Don't enter personal or sensitive information.",
    tutorName: 'Gemma 4 Tutor',
    tutorDescription: 'Accurate, structured explanations and study planning powered by Gemma.',
    navTools: 'Study Tools',
    toggleNavigation: 'Toggle navigation menu',
    quizChars: '3 to 6000 characters',
    core: 'Core',
    fiveMcqs: '5 MCQs',
    timeline: 'Timeline',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    explain: 'विषय समझें',
    summary: 'नोट्स सारांश',
    quiz: 'क्विज़ बनाएं',
    plan: 'स्टडी प्लान',
    history: 'स्टडी हिस्ट्री',
    engineReady: 'इंजन तैयार',
    engineOffline: 'ऑफलाइन',
    checkingStatus: 'कनेक्ट हो रहा है…',
    languageLabel: 'वर्तमान भाषा {lang} है। टॉगल करने के लिए क्लिक करें।',
    themeLabel: 'लाइट या डार्क थीम बदलें',
    wakeup: 'स्टडी इंजन शुरू हो रहा है… इसमें पहली बार एक मिनट तक लग सकता है।',
    localHistoryNote: 'हिस्ट्री केवल इस ब्राउज़र में आपके डिवाइस पर सुरक्षित रहती है और बैकएंड को नहीं भेजी जाती।',
    clearAll: 'सभी हटाएँ',
    reviewHistory: 'आपके पहले बने स्पष्टीकरण, सारांश, क्विज़ स्कोर और रोडमैप देखें।',
    retry: 'फिर से कोशिश करें',
    settings: 'सेटिंग्स',
    assistantTagline: 'बेहतर पढ़ें, समझदारी से सीखें।',
    aiPowered: 'AI आधारित अध्ययन सहायक',
    heroTitle: 'Gemma 4 के साथ अपनी पढ़ाई को बेहतर बनाएं',
    heroDescription: 'अपनी समय-सीमा के अनुसार स्पष्टीकरण, नोट्स सारांश, क्विज़ और स्टडी प्लान पाएं।',
    startExplain: 'विषय समझें',
    buildPlan: 'स्टडी प्लान बनाएं',
    studyTools: 'अध्ययन उपकरण',
    interactiveFeatures: '4 इंटरैक्टिव सुविधाएं',
    toolExplainDescription: 'किसी भी विषय के स्पष्ट स्पष्टीकरण, उदाहरण और मुख्य बिंदु।',
    toolSummaryDescription: 'अपने नोट्स से मुख्य बातें और शब्दावली संक्षेप में पाएं।',
    toolQuizDescription: 'पांच प्रश्नों वाले इंटरैक्टिव क्विज़ से खुद को परखें।',
    toolPlanDescription: 'अपनी समय-सीमा के अनुसार एक व्यावहारिक समय-सारणी बनाएं।',
    explainDescription: 'रोज़मर्रा के उदाहरणों और मुख्य बिंदुओं के साथ विषय को आसानी से समझें।',
    topicOrConcept: 'विषय या अवधारणा',
    topicPlaceholder: 'जैसे प्रकाश संश्लेषण, न्यूटन का तीसरा नियम',
    minimum3: 'कम से कम 3 अक्षर',
    studentLevel: 'विद्यार्थी का स्तर',
    beginner: 'शुरुआती',
    intermediate: 'मध्यम',
    advanced: 'उन्नत',
    explaining: 'समझाया जा रहा है…',
    explainIt: 'समझाएं',
    tryExample: 'उदाहरण आज़माएं:',
    craftingExplanation: 'स्पष्टीकरण तैयार हो रहा है…',
    enterTopic: 'शुरू करने के लिए ऊपर विषय लिखें या उदाहरण चुनें।',
    explanation: 'स्पष्टीकरण',
    realLifeExample: 'वास्तविक जीवन का उदाहरण',
    keyTakeaways: 'मुख्य बातें',
    oneLine: 'एक पंक्ति में:',
    quizOnTopic: 'इस विषय पर क्विज़ लें',
    copy: 'कॉपी करें',
    copied: 'कॉपी हो गया!',
    summarizeDescription: 'अपने अध्ययन सामग्री से मुख्य बातें और शब्दावली पाएं।',
    studyNotes: 'अध्ययन नोट्स या लेख',
    notesPlaceholder: 'अपने नोट्स यहां पेस्ट करें (50 से 8000 अक्षर)…',
    needs50: 'कम से कम 50 अक्षर आवश्यक हैं',
    over8000: '8000 अक्षरों की सीमा से अधिक',
    charRange: '50–8000 अक्षर',
    shortenNotes: 'कृपया नोट्स को 8000 अक्षरों तक छोटा करें।',
    summaryDepth: 'सारांश की लंबाई',
    shortRecap: 'छोटा (त्वरित सार)',
    mediumDetailed: 'मध्यम (विस्तृत)',
    summarizing: 'सारांश बनाया जा रहा है…',
    summarize: 'सारांश बनाएं',
    synthesizing: 'नोट्स का सार तैयार हो रहा है…',
    pasteNotes: 'सारांश के लिए ऊपर व्याख्यान नोट्स या पाठ्यांश पेस्ट करें।',
    notesSummary: 'नोट्स का सारांश',
    corePoints: 'मुख्य बिंदु',
    keyVocabulary: 'मुख्य शब्दावली',
    quizFromSummary: 'इस सारांश से क्विज़ बनाएं',
    quizDescription: 'व्याख्याओं के साथ पांच प्रश्नों का इंटरैक्टिव टेस्ट बनाएं।',
    topicOrMaterial: 'विषय या अध्ययन सामग्री',
    quizPlaceholder: 'क्विज़ के लिए विषय लिखें या नोट्स पेस्ट करें…',
    difficulty: 'कठिनाई',
    easy: 'आसान',
    medium: 'मध्यम',
    hard: 'कठिन',
    generatingQuiz: 'क्विज़ बनाया जा रहा है…',
    generateQuiz: 'क्विज़ बनाएं',
    draftingQuestions: '5 प्रश्न तैयार हो रहे हैं…',
    launchQuiz: 'क्विज़ शुरू करने के लिए विषय लिखें या नोट्स पेस्ट करें।',
    question: 'प्रश्न',
    of: 'में से',
    checkAnswer: 'उत्तर जांचें',
    nextQuestion: 'अगला प्रश्न →',
    seeResults: 'परिणाम देखें 🎉',
    quizCompleted: 'क्विज़ पूरा हुआ',
    outstanding: '🎉 शानदार! पूरे अंक!',
    solidWork: '👍 अच्छा प्रयास! मुख्य बातों का अभ्यास जारी रखें।',
    reviewAnswers: '📚 नीचे दिए स्पष्टीकरण पढ़ें और फिर प्रयास करें।',
    retakeQuiz: 'क्विज़ फिर से लें',
    newQuiz: 'नया क्विज़',
    questionReview: 'प्रश्नों की समीक्षा',
    correctAnswer: 'सही उत्तर:',
    yourAnswer: 'आपका उत्तर:',
    why: 'कारण:',
    explanationLabel: 'स्पष्टीकरण:',
    planDescription: 'अपनी समय-सीमाओं और उपलब्ध समय के अनुसार व्यावहारिक दैनिक समय-सारणी बनाएं।',
    subjects: 'विषय (1 से 6)',
    subject: 'विषय',
    subjectName: 'विषय का नाम *',
    subjectPlaceholder: 'जैसे भौतिकी, रसायन विज्ञान, इतिहास',
    targetDeadline: 'लक्ष्य समय-सीमा (वैकल्पिक)',
    topicsChapters: 'विशिष्ट विषय या अध्याय (वैकल्पिक)',
    topicsPlaceholder: 'जैसे ऊष्मागतिकी, तरंगें, प्रकाशिकी',
    removeSubject: 'विषय हटाएं',
    addSubject: 'एक और विषय जोड़ें',
    dailyStudyHours: 'प्रतिदिन अध्ययन घंटे',
    hoursPerDay: 'घंटे / दिन (0.5 से 12)',
    startDate: 'आरंभ तिथि',
    creatingPlan: 'प्लान बनाया जा रहा है…',
    createPlan: 'मेरा प्लान बनाएं',
    sequencingPlan: 'पढ़ाई के दिनों की योजना बन रही है…',
    configurePlan: 'समय-सारणी बनाने के लिए ऊपर विषय और दैनिक घंटे भरें।',
    personalizedRoadmap: 'आपके लिए अध्ययन योजना',
    dayStudyPlan: '{days}-दिन की अध्ययन योजना',
    copyAsText: 'टेक्स्ट कॉपी करें',
    truncatedPlan: 'पहले 14 दिन दिखाए गए हैं। आगे की समय-सीमा के लिए बाद में फिर से बनाएं।',
    sessionProgress: 'अध्ययन सत्र की प्रगति',
    sessionsDone: '{total} में से {done} पूरे ({percent}%)',
    dailySchedule: 'दैनिक समय-सारणी',
    dayNumber: 'दिन {day}',
    totalMinutes: 'कुल {minutes} मिनट',
    restDay: 'विश्राम दिवस',
    restDayMessage: 'विश्राम करें 🌿 ऊर्जा पाएं और सीखी बातों को दोहराएं।',
    studyTips: 'अध्ययन के सुझाव',
    quizzesTaken: 'क्विज़ की संख्या',
    bestScore: 'सर्वश्रेष्ठ अंक',
    averageScore: 'औसत अंक',
    roadmaps: 'योजनाएं',
    all: 'सभी',
    explainTab: 'स्पष्टीकरण',
    summaryTab: 'सारांश',
    quizTab: 'क्विज़',
    planTab: 'योजना',
    explanationType: 'स्पष्टीकरण',
    summaryType: 'सारांश',
    planType: 'अध्ययन योजना',
    loadDemo: 'डेमो डेटा लोड करें',
    deleteItems: 'सभी {count} प्रविष्टियां हटाएं?',
    deleteYes: 'हां, हटाएं',
    cancel: 'रद्द करें',
    viewingSaved: 'सहेजा गया {type} देख रहे हैं',
    closeView: 'दृश्य बंद करें',
    nothingSaved: '{type} में अभी कुछ भी सहेजा नहीं गया है।',
    localDataWarning: 'आपकी अध्ययन हिस्ट्री में निजी नोट्स या परिणाम हो सकते हैं। यह केवल इसी डिवाइस के ब्राउज़र में रहती है और बैकएंड को नहीं भेजी जाती।',
    couldNotExplain: 'इस विषय को समझाया नहीं जा सका। कृपया फिर कोशिश करें।',
    couldNotSummarize: 'नोट्स का सारांश नहीं बन सका। कृपया फिर कोशिश करें।',
    couldNotGenerateQuiz: 'क्विज़ नहीं बन सका। कृपया फिर कोशिश करें।',
    couldNotCreatePlan: 'अध्ययन योजना नहीं बन सकी। कृपया फिर कोशिश करें।',
    aiEngineStatus: 'AI इंजन की स्थिति',
    refresh: 'रीफ्रेश करें',
    checking: 'जांच हो रही है…',
    backendApi: 'बैकएंड API',
    online: 'ऑनलाइन (200)',
    modelTarget: 'मॉडल',
    aiConfigured: 'AI कॉन्फ़िगर है',
    yesKeySet: 'हां (की सेट है)',
    noPendingKey: 'नहीं (की बाकी है)',
    specVersion: 'स्पेक संस्करण',
    quizMe: 'इस पर क्विज़ लें',
    emptyHistory: 'अभी कोई प्रविष्टि नहीं है — कोई टूल आज़माएं, आपके परिणाम यहां दिखेंगे।',
    open: 'खोलें',
    hide: 'छिपाएं',
    deleteItem: 'प्रविष्टि हटाएं',
    savedSession: 'सहेजा गया अध्ययन सत्र',
    historyEmptyDescription: 'आपके बनाए स्पष्टीकरण, सारांश, क्विज़ और अध्ययन योजनाएं यहां अपने आप दिखेंगी।',
    startLearning: 'अभी सीखना शुरू करें',
    loadSampleData: 'नमूना डेटा लोड करें',
    allHistory: 'हिस्ट्री',
    itemDeleted: 'प्रविष्टि हटाई गई',
    clearHistory: 'हिस्ट्री साफ़ करें',
    localHistoryTitle: 'हिस्ट्री इस डिवाइस पर सेव है',
    errorValidation: 'कृपया दर्ज की गई जानकारी जांचें और फिर कोशिश करें।',
    errorUnsuitable: 'इस जानकारी का उपयोग नहीं हो सका। कृपया विषय या अध्ययन नोट्स दें।',
    errorRateLimited: 'स्टडी इंजन व्यस्त है। थोड़ी देर बाद फिर कोशिश करें।',
    errorModelInvalid: 'स्टडी इंजन सही उत्तर तैयार नहीं कर सका। कृपया फिर कोशिश करें।',
    errorModelUnavailable: 'स्टडी इंजन अभी उपलब्ध नहीं है। कृपया बाद में कोशिश करें।',
    errorTimeout: 'अनुरोध में अधिक समय लगा। कृपया फिर कोशिश करें।',
    errorNetwork: 'StudySpark सर्वर से कनेक्ट नहीं हो सका। कनेक्शन जांचकर फिर कोशिश करें।',
    errorGeneric: 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।',
    aiKeyMissing: 'AI की कॉन्फ़िगर नहीं है',
    toggleLanguage: 'अंग्रेज़ी और हिंदी की भाषा बदलें',
    switchToLight: 'लाइट मोड पर जाएं',
    switchToDark: 'डार्क मोड पर जाएं',
    thinking: 'सोच रहा है…',
    findingWords: 'सरल शब्द खोजे जा रहे हैं…',
    organizingPoints: 'मुख्य बिंदु व्यवस्थित हो रहे हैं…',
    almostThere: 'लगभग तैयार…',
    tailoringResponse: 'Gemma आपके लिए उत्तर तैयार कर रहा है।',
    somethingWrong: 'कुछ गड़बड़ हुई',
    tryAgain: 'फिर कोशिश करें',
    readyToLearn: 'सीखने के लिए तैयार',
    fillForm: 'अध्ययन सामग्री बनाने के लिए ऊपर दिया फ़ॉर्म भरें।',
    safetyFooter: 'AI गलत हो सकता है — महत्वपूर्ण जानकारी जांचें। निजी या संवेदनशील जानकारी न दें।',
    tutorName: 'Gemma 4 ट्यूटर',
    tutorDescription: 'Gemma से सटीक और व्यवस्थित स्पष्टीकरण व अध्ययन योजना पाएं।',
    navTools: 'अध्ययन उपकरण',
    toggleNavigation: 'नेविगेशन मेनू बदलें',
    quizChars: '3 से 6000 अक्षर',
    core: 'मुख्य',
    fiveMcqs: '5 प्रश्न',
    timeline: 'समय-सारणी',
  },
};

const sanitizeTheme = (value) => {
  if (VALID_THEMES.includes(value)) return value;
  return defaultSettings.theme;
};

const sanitizeLanguage = (value) => {
  if (VALID_LANGUAGES.includes(value)) return value;
  return defaultSettings.language;
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useLocalStorage(SETTINGS_STORAGE_KEY, defaultSettings);

  const normalizedSettings = useMemo(() => ({
    theme: sanitizeTheme(settings?.theme),
    language: sanitizeLanguage(settings?.language),
  }), [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        normalizedSettings.theme === 'dark' ||
        (normalizedSettings.theme === 'system' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (normalizedSettings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [normalizedSettings.theme]);

  useEffect(() => {
    document.documentElement.lang = normalizedSettings.language;
  }, [normalizedSettings.language]);

  const setTheme = (theme) => {
    const nextTheme = sanitizeTheme(theme);
    setSettings((prev) => ({ ...(prev || defaultSettings), theme: nextTheme }));
  };

  const setLanguage = (language) => {
    const nextLanguage = sanitizeLanguage(language);
    setSettings((prev) => ({ ...(prev || defaultSettings), language: nextLanguage }));
  };

  const toggleLanguage = () => {
    setLanguage(normalizedSettings.language === 'en' ? 'hi' : 'en');
  };

  const toggleTheme = () => {
    const isDark =
      normalizedSettings.theme === 'dark' ||
      (normalizedSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(isDark ? 'light' : 'dark');
  };

  const t = (key, params = {}) => {
    const dictionary = UI_TEXT[normalizedSettings.language] || UI_TEXT.en;
    const template = dictionary[key] || UI_TEXT.en[key] || key;
    return Object.entries(params).reduce((result, [param, value]) => {
      return result.replace(`{${param}}`, value);
    }, template);
  };

  const formatError = (error) => {
    const errorKeys = {
      VALIDATION_ERROR: 'errorValidation',
      UNSUITABLE_INPUT: 'errorUnsuitable',
      RATE_LIMITED: 'errorRateLimited',
      MODEL_OUTPUT_INVALID: 'errorModelInvalid',
      MODEL_UNAVAILABLE: 'errorModelUnavailable',
      MODEL_TIMEOUT: 'errorTimeout',
      CLIENT_TIMEOUT: 'errorTimeout',
      NETWORK_ERROR: 'errorNetwork',
      INTERNAL_ERROR: 'errorGeneric',
    };
    const key = errorKeys[error?.code];
    return key ? t(key) : error?.message || t('errorGeneric');
  };

  return (
    <SettingsContext.Provider
      value={{
        theme: normalizedSettings.theme,
        language: normalizedSettings.language,
        setTheme,
        setLanguage,
        toggleTheme,
        toggleLanguage,
        t,
        formatError,
        uiText: UI_TEXT,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
