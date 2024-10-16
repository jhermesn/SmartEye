// background.js

// Listener para o evento de instalação da extensão
chrome.runtime.onInstalled.addListener(() => {
  // Configurações padrão ao instalar a extensão
  chrome.storage.sync.set({
    voiceLanguage: 'pt-BR', // Define o idioma padrão para síntese de voz como Português do Brasil
    voiceRate: '1', // Define a velocidade padrão da voz
    voiceVolume: '1', // Define o volume padrão da voz
    selectedVoice: 0, // Index da voz padrão selecionada
    selectedModel: 'gpt-4o-mini', // Define o modelo padrão da OpenAI
    openAIApiKey: '' // Inicializa sem uma chave da OpenAI
  });
});