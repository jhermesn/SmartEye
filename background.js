chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    voiceLanguage: 'pt-BR',
    voiceRate: '1',
    voiceVolume: '1',
    selectedVoice: 0,
    selectedModel: 'gemini-1.5-flash',
    geminiApiKey: ''
  });
});