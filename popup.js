document.addEventListener('DOMContentLoaded', async () => {
  const dom = {
    apiKeySection: document.getElementById('apiKeySection'),
    extensionContent: document.getElementById('extensionContent'),
    summaryDiv: document.getElementById('summary'),
    summaryLanguageSelect: document.getElementById('summaryLanguage'),
    voiceSelect: document.getElementById('voiceSelect'),
    voiceRate: document.getElementById('voiceRate'),
    rateValue: document.getElementById('rateValue'),
    voiceVolume: document.getElementById('voiceVolume'),
    volumeValue: document.getElementById('volumeValue'),
    speakSummaryButton: document.getElementById('speakSummary'),
    geminiApiKeyInput: document.getElementById('geminiApiKey'),
    saveApiKeyButton: document.getElementById('saveApiKey'),
    modelSelect: document.getElementById('modelSelect'),
    refreshModelsButton: document.getElementById('refreshModels'),
    statusIndicator: document.getElementById('statusIndicator'),
    toggleThemeButton: document.getElementById('toggleTheme'),
    selectedModelSpan: document.getElementById('selectedModel'),
    completedFrame: document.getElementById('completedFrame'),
    backToStartButton: document.getElementById('backToStart'),
    openExistingSummaryButton: document.getElementById('openExistingSummary'),
    createNewSummaryButton: document.getElementById('createNewSummary'),
    modifyApiKeyButton: document.getElementById('modifyApiKey'),
    summaryDetail: document.getElementById('summaryDetail'),
    summaryDetailValue: document.getElementById('summaryDetailValue'),
    audioPlayer: document.getElementById('audioPlayer'),
    playPauseButton: document.getElementById('playPauseButton'),
    stopButton: document.getElementById('stopButton'),
    progressBar: document.getElementById('progressBar'),
    currentTime: document.getElementById('currentTime'),
    totalTime: document.getElementById('totalTime'),
  };

  let voices = [];
  let currentUtterance = null;
  let isPlaying = false;
  let isPaused = false;
  let progressInterval = null;

  const updateStatus = (status, message = '') => {
    dom.statusIndicator.className = '';
    const statusConfig = {
      idle: { class: 'status-gray', text: 'Nenhuma ação' },
      working: { class: 'status-yellow', text: 'Trabalhando...' },
      completed: { class: 'status-green', text: message || 'Concluído' },
      error: { class: 'status-red', text: message ? `Erro: ${message}` : 'Erro' },
    };
    const config = statusConfig[status] || statusConfig.idle;
    dom.statusIndicator.classList.add(config.class);
    dom.statusIndicator.textContent = config.text;
  };

  const getApiKey = async () => {
    const data = await chrome.storage.sync.get(['geminiApiKey']);
    return data.geminiApiKey;
  };

  const saveApiKey = async (apiKey) => {
    await chrome.storage.sync.set({ geminiApiKey: apiKey });
  };

  const getSupportedModels = () => [
    "gemini-1.5-flash", 
    "gemini-1.5-pro", 
    "gemini-pro", 
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-002"
  ];

  const populateModelOptions = () => {
    const models = getSupportedModels();
    dom.modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      dom.modelSelect.appendChild(option);
    });
  };

  const getSelectedModel = async () => {
    const data = await chrome.storage.sync.get(['selectedModel']);
    return data.selectedModel || 'gemini-1.5-flash';
  };

  const saveSummary = async (url, summary) => {
    const { summaries = {} } = await chrome.storage.local.get(['summaries']);
    const today = new Date().toISOString().split('T')[0];
    if (!summaries[url]) {
      summaries[url] = {};
    }
    summaries[url][today] = { summary };
    await chrome.storage.local.set({ summaries });
  };

  const loadVoices = () => {
    return new Promise((resolve) => {
      voices = speechSynthesis.getVoices();
      if (voices.length) {
        populateVoices(dom.summaryLanguageSelect.value);
        resolve();
      } else {
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          populateVoices(dom.summaryLanguageSelect.value);
          resolve();
        };
      }
    });
  };

  const populateVoices = (language) => {
    dom.voiceSelect.innerHTML = '';
    const langCode = language.split('-')[0];
    const filteredVoices = voices.filter(voice => voice.lang.startsWith(langCode));
    if (filteredVoices.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Nenhuma voz disponível.';
      option.disabled = true;
      dom.voiceSelect.appendChild(option);
      return;
    }
    filteredVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      dom.voiceSelect.appendChild(option);
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateProgress = () => {
    if (!currentUtterance || !isPlaying) return;
    
    const elapsed = Date.now() - currentUtterance.startTime;
    const progress = Math.min((elapsed / currentUtterance.estimatedDuration) * 100, 100);
    
    dom.progressBar.value = progress;
    dom.currentTime.textContent = formatTime(elapsed / 1000);
  };

  const startProgressTracking = () => {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(updateProgress, 100);
  };

  const stopProgressTracking = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const initializePlayer = () => {
    const text = dom.summaryDiv.textContent;
    if (!text) return;

    // Para a reprodução atual se houver
    speechSynthesis.cancel();
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.name === dom.voiceSelect.value);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
    
    currentUtterance.rate = parseFloat(dom.voiceRate.value);
    currentUtterance.volume = parseFloat(dom.voiceVolume.value);
    
    // Estima duração baseada no texto e velocidade
    const wordsPerMinute = 150 * currentUtterance.rate;
    const wordCount = text.split(' ').length;
    const estimatedDuration = (wordCount / wordsPerMinute) * 60 * 1000;
    currentUtterance.estimatedDuration = estimatedDuration;
    
    dom.totalTime.textContent = formatTime(estimatedDuration / 1000);
    dom.progressBar.value = 0;
    dom.currentTime.textContent = formatTime(0);

    currentUtterance.onstart = () => {
      currentUtterance.startTime = Date.now();
      isPlaying = true;
      isPaused = false;
      dom.playPauseButton.innerHTML = '<span class="material-icons">pause</span>';
      startProgressTracking();
    };

    currentUtterance.onend = () => {
      isPlaying = false;
      isPaused = false;
      dom.playPauseButton.innerHTML = '<span class="material-icons">play_arrow</span>';
      dom.progressBar.value = 100;
      stopProgressTracking();
    };

    currentUtterance.onpause = () => {
      isPaused = true;
      dom.playPauseButton.innerHTML = '<span class="material-icons">play_arrow</span>';
      stopProgressTracking();
    };

    currentUtterance.onresume = () => {
      isPaused = false;
      dom.playPauseButton.innerHTML = '<span class="material-icons">pause</span>';
      startProgressTracking();
    };
  };

  const togglePlayPause = () => {
    if (!currentUtterance) {
      initializePlayer();
    }

    if (isPlaying && !isPaused) {
      speechSynthesis.pause();
    } else if (isPaused) {
      speechSynthesis.resume();
    } else {
      speechSynthesis.speak(currentUtterance);
    }
  };

  const stopAudio = () => {
    speechSynthesis.cancel();
    isPlaying = false;
    isPaused = false;
    dom.playPauseButton.innerHTML = '<span class="material-icons">play_arrow</span>';
    dom.progressBar.value = 0;
    dom.currentTime.textContent = formatTime(0);
    stopProgressTracking();
  };

  const seekToPosition = (percentage) => {
    if (!currentUtterance) return;
 
    stopAudio();
    setTimeout(() => {
      initializePlayer();
      dom.progressBar.value = percentage;
    }, 100);
  };

  const summarizeText = async (text, model, language, detailLevel) => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const langMap = {
      'pt-BR': { lang: 'português (Brasil)', tpl: 'Resuma o texto a seguir em', detail: { 1: 'uma frase', 2: 'um parágrafo', 3: 'detalhadamente' } },
      'en-US': { lang: 'inglês (EUA)', tpl: 'Summarize the following text in', detail: { 1: 'one sentence', 2: 'one paragraph', 3: 'detail' } },
      'es-ES': { lang: 'espanhol (Espanha)', tpl: 'Resume el siguiente texto en', detail: { 1: 'una frase', 2: 'un párrafo', 3: 'detallado' } },
    };
    const { lang, tpl, detail } = langMap[language] || langMap['en-US'];
    const prompt = `${tpl} ${detail[detailLevel]} em ${lang}:\n\n${text}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro da API: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Resposta inválida da API do Gemini.');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Chave da API inválida.');
      }
      throw new Error(`Falha na comunicação com a API do Gemini: ${error.message}`);
    }
  };

  const checkExistingSummary = async (url) => {
    const { summaries = {} } = await chrome.storage.local.get(['summaries']);
    const today = new Date().toISOString().split('T')[0];
    const summary = summaries[url]?.[today]?.summary;
    dom.openExistingSummaryButton.style.display = summary ? 'block' : 'none';
  };

  const showView = (view) => {
    ['apiKeySection', 'extensionContent', 'completedFrame'].forEach(s => dom[s].style.display = 'none');
    if (dom[view]) dom[view].style.display = 'block';
  };

  const initialize = async (apiKey) => {
    const key = apiKey || await getApiKey();
    if (key) {
      showView('extensionContent');
      populateModelOptions();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) checkExistingSummary(tab.url);
    } else {
      showView('apiKeySection');
    }
    updateSummaryDetailValue();
    loadVoices();
  };

  const updateSummaryDetailValue = () => {
    const detailMap = { 1: 'Bem Resumido', 2: 'Resumido', 3: 'Super Detalhado' };
    dom.summaryDetailValue.textContent = detailMap[dom.summaryDetail.value] || 'Resumido';
  };

  dom.saveApiKeyButton.addEventListener('click', async () => {
    try {
      const apiKey = dom.geminiApiKeyInput.value.trim();
      
      if (!apiKey) {
        alert('Por favor, insira uma chave da API do Gemini válida.');
        updateStatus('error', 'Chave da API vazia');
        return;
      }

      updateStatus('working');
      
      dom.saveApiKeyButton.disabled = true;
      
      await saveApiKey(apiKey);
      
      const savedKey = await getApiKey();
      if (savedKey !== apiKey) {
        throw new Error('Falha ao salvar a chave da API');
      }
      
      await initialize(apiKey);
      updateStatus('completed', 'Chave salva com sucesso');
      
      setTimeout(() => {
        updateStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao salvar chave da API:', error);
      updateStatus('error', error.message || 'Erro desconhecido');
      alert(`Erro ao salvar chave: ${error.message || 'Erro desconhecido'}`);
    } finally {
      dom.saveApiKeyButton.disabled = false;
    }
  });

  dom.modifyApiKeyButton.addEventListener('click', () => showView('apiKeySection'));
  dom.refreshModelsButton.addEventListener('click', populateModelOptions);

  dom.createNewSummaryButton.addEventListener('click', async () => {
    updateStatus('working');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('Nenhuma aba ativa encontrada.');

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getText" });
      if (!response?.text) throw new Error('Não foi possível obter o texto da página.');

      const model = await getSelectedModel();
      const language = dom.summaryLanguageSelect.value;
      const detailLevel = parseInt(dom.summaryDetail.value, 10);
      const summary = await summarizeText(response.text, model, language, detailLevel);
      
      showView('completedFrame');
      dom.summaryDiv.textContent = summary;
      await saveSummary(tab.url, summary);
      updateStatus('completed');
      
      stopAudio();
      dom.audioPlayer.style.display = 'none';
      dom.speakSummaryButton.innerHTML = '<span class="material-icons">volume_up</span>Iniciar Player de Áudio';
      currentUtterance = null;
    } catch (error) {
      updateStatus('error', error.message);
      if (error.message.includes('API') || error.message.includes('Chave')) {
        showView('apiKeySection');
      }
    }
  });

  dom.openExistingSummaryButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const { summaries = {} } = await chrome.storage.local.get(['summaries']);
    const today = new Date().toISOString().split('T')[0];
    const summary = summaries[tab.url]?.[today]?.summary;
    if (summary) {
      dom.summaryDiv.textContent = summary;
      showView('completedFrame');
      updateStatus('completed');
      
      stopAudio();
      dom.audioPlayer.style.display = 'none';
      dom.speakSummaryButton.innerHTML = '<span class="material-icons">volume_up</span>Iniciar Player de Áudio';
      currentUtterance = null;
    }
  });

  dom.speakSummaryButton.addEventListener('click', () => {
    const isPlayerVisible = dom.audioPlayer.style.display !== 'none';
    if (isPlayerVisible) {
      dom.audioPlayer.style.display = 'none';
      dom.speakSummaryButton.innerHTML = '<span class="material-icons">volume_up</span>Iniciar Player de Áudio';
      stopAudio();
    } else {
      dom.audioPlayer.style.display = 'block';
      dom.speakSummaryButton.innerHTML = '<span class="material-icons">volume_off</span>Fechar Player de Áudio';
      initializePlayer();
    }
  });

  dom.playPauseButton.addEventListener('click', togglePlayPause);
  dom.stopButton.addEventListener('click', stopAudio);
  
  dom.progressBar.addEventListener('input', () => {
    const percentage = parseFloat(dom.progressBar.value);
    if (currentUtterance && !isPlaying) {
      seekToPosition(percentage);
    }
  });

  dom.voiceRate.addEventListener('input', () => {
    dom.rateValue.textContent = dom.voiceRate.value;
    if (currentUtterance) {
      currentUtterance.rate = parseFloat(dom.voiceRate.value);
      const text = dom.summaryDiv.textContent;
      const wordsPerMinute = 150 * currentUtterance.rate;
      const wordCount = text.split(' ').length;
      const estimatedDuration = (wordCount / wordsPerMinute) * 60 * 1000;
      currentUtterance.estimatedDuration = estimatedDuration;
      dom.totalTime.textContent = formatTime(estimatedDuration / 1000);
    }
  });

  dom.voiceVolume.addEventListener('input', () => {
    dom.volumeValue.textContent = dom.voiceVolume.value;
    if (currentUtterance) {
      currentUtterance.volume = parseFloat(dom.voiceVolume.value);
    }
  });
  dom.summaryLanguageSelect.addEventListener('change', () => populateVoices(dom.summaryLanguageSelect.value));
  dom.summaryDetail.addEventListener('input', updateSummaryDetailValue);
  
  dom.backToStartButton.addEventListener('click', () => {
    showView('extensionContent');
    dom.summaryDiv.textContent = '';
    updateStatus('idle');
    
    stopAudio();
    dom.audioPlayer.style.display = 'none';
    dom.speakSummaryButton.innerHTML = '<span class="material-icons">volume_up</span>Iniciar Player de Áudio';
    currentUtterance = null;
  });

  dom.toggleThemeButton.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    const isLight = document.documentElement.classList.contains('light');
    chrome.storage.sync.set({ isLight });
  });

  initialize();
});