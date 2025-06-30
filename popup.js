import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

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
  };

  let voices = [];

  const updateStatus = (status, message = '') => {
    dom.statusIndicator.className = '';
    const statusConfig = {
      idle: { class: 'status-gray', text: 'Nenhuma ação' },
      working: { class: 'status-yellow', text: 'Trabalhando...' },
      completed: { class: 'status-green', text: 'Concluído' },
      error: { class: 'status-red', text: `Erro: ${message}` },
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

  const getSupportedModels = () => ["gemini-1.5-flash", "gemini-pro"];

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

  const speakSummary = () => {
    const text = dom.summaryDiv.textContent;
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.name === dom.voiceSelect.value);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = parseFloat(dom.voiceRate.value);
    utterance.volume = parseFloat(dom.voiceVolume.value);
    speechSynthesis.speak(utterance);
  };

  const summarizeText = async (text, model, language, detailLevel) => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const langMap = {
      'pt-BR': { lang: 'português (Brasil)', tpl: 'Resuma o texto a seguir em', detail: { 1: 'uma frase', 2: 'um parágrafo', 3: 'detalhadamente' } },
      'en-US': { lang: 'inglês (EUA)', tpl: 'Summarize the following text in', detail: { 1: 'one sentence', 2: 'one paragraph', 3: 'detail' } },
      'es-ES': { lang: 'espanhol (Espanha)', tpl: 'Resume el siguiente texto en', detail: { 1: 'una frase', 2: 'un párrafo', 3: 'detallado' } },
    };
    const { lang, tpl, detail } = langMap[language] || langMap['en-US'];
    const prompt = `${tpl} ${detail[detailLevel]} em ${lang}:\n\n${text}`;

    try {
      const result = await geminiModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw new Error('Falha na comunicação com a API do Gemini.');
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

  const initialize = async () => {
    const apiKey = await getApiKey();
    if (apiKey) {
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
    const apiKey = dom.geminiApiKeyInput.value.trim();
    if (!apiKey) {
      alert('Por favor, insira uma chave da API do Gemini válida.');
      return;
    }
    updateStatus('working');
    await saveApiKey(apiKey);
    await initialize();
    updateStatus('idle');
  });

  dom.modifyApiKeyButton.addEventListener('click', () => showView('apiKeySection'));
  dom.refreshModelsButton.addEventListener('click', populateModelOptions);

  dom.createNewSummaryButton.addEventListener('click', async () => {
    showView('completedFrame');
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
      
      dom.summaryDiv.textContent = summary;
      await saveSummary(tab.url, summary);
      updateStatus('completed');
    } catch (error) {
      updateStatus('error', error.message);
      if (error.message.includes('API do Gemini')) showView('apiKeySection');
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
    }
  });

  dom.speakSummaryButton.addEventListener('click', speakSummary);
  dom.voiceRate.addEventListener('input', () => dom.rateValue.textContent = dom.voiceRate.value);
  dom.voiceVolume.addEventListener('input', () => dom.volumeValue.textContent = dom.voiceVolume.value);
  dom.summaryLanguageSelect.addEventListener('change', () => populateVoices(dom.summaryLanguageSelect.value));
  dom.summaryDetail.addEventListener('input', updateSummaryDetailValue);
  
  dom.backToStartButton.addEventListener('click', () => {
    showView('extensionContent');
    dom.summaryDiv.textContent = '';
    updateStatus('idle');
  });

  dom.toggleThemeButton.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    const isLight = document.documentElement.classList.contains('light');
    chrome.storage.sync.set({ isLight });
  });

  initialize();
});