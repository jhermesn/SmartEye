// popup.js

// Aguarda o carregamento completo do DOM antes de executar o script
document.addEventListener('DOMContentLoaded', async () => {
  // Inicialização de elementos do DOM e configuração de eventos
  console.log("Popup carregado.");

  // Seleção de elementos do DOM pelo ID
  const apiKeySection = document.getElementById('apiKeySection');
  const extensionContent = document.getElementById('extensionContent');
  const createSummarySection = document.getElementById('createSummarySection');
  const summaryDiv = document.getElementById('summary');
  const summaryLanguageSelect = document.getElementById('summaryLanguage'); // Seletor de idioma
  const voiceSelect = document.getElementById('voiceSelect'); // Seletor de voz
  const voiceRate = document.getElementById('voiceRate'); // Controle de velocidade da voz
  const rateValue = document.getElementById('rateValue'); // Exibição do valor da velocidade
  const voiceVolume = document.getElementById('voiceVolume'); // Controle de volume da voz
  const volumeValue = document.getElementById('volumeValue'); // Exibição do valor do volume
  const speakSummaryButton = document.getElementById('speakSummary'); // Botão para falar o resumo
  const openAIApiKeyInput = document.getElementById('openAIApiKey'); // Campo de entrada da chave API
  const saveApiKeyButton = document.getElementById('saveApiKey'); // Botão para salvar a chave API
  const modelSelect = document.getElementById('modelSelect'); // Seletor de modelo da OpenAI
  const refreshModelsButton = document.getElementById('refreshModels'); // Botão para atualizar modelos
  const statusIndicator = document.getElementById('statusIndicator'); // Indicador de status
  const toggleThemeButton = document.getElementById('toggleTheme'); // Botão para alternar tema
  const selectedModelSpan = document.getElementById('selectedModel'); // Exibição do modelo selecionado
  const completedFrame = document.getElementById('completedFrame'); // Frame exibido após conclusão
  const backToStartButton = document.getElementById('backToStart'); // Botão para voltar ao início
  const openExistingSummaryButton = document.getElementById('openExistingSummary'); // Botão para abrir resumo existente
  const createNewSummaryButton = document.getElementById('createNewSummary'); // Botão para criar novo resumo
  const modifyApiKeyButton = document.getElementById('modifyApiKey'); // Botão para modificar chave API

  const summaryDetail = document.getElementById('summaryDetail'); // Controle de detalhamento do resumo
  const summaryDetailValue = document.getElementById('summaryDetailValue'); // Exibição do nível de detalhamento

  let voices = []; // Array para armazenar as vozes disponíveis

  /**
   * Atualiza o indicador de status com base no status fornecido.
   * @param {string} status - O status atual ('idle', 'working', 'completed', 'error').
   * @param {string} [message] - Mensagem adicional em caso de erro.
   */
  function updateStatus(status, message = '') {
    console.log(`Status atualizado para: ${status} - ${message}`);
    statusIndicator.className = ''; // Remove classes anteriores
    switch(status) {
      case 'idle':
        statusIndicator.classList.add('status-gray');
        statusIndicator.textContent = 'Nenhuma ação';
        break;
      case 'working':
        statusIndicator.classList.add('status-yellow');
        statusIndicator.textContent = 'Trabalhando...';
        break;
      case 'completed':
        statusIndicator.classList.add('status-green');
        statusIndicator.textContent = 'Concluído';
        break;
      case 'error':
        statusIndicator.classList.add('status-red');
        statusIndicator.textContent = `Erro: ${message}`;
        break;
      default:
        statusIndicator.classList.add('status-gray');
        statusIndicator.textContent = 'Nenhuma ação';
    }
  }

  /**
   * Obtém a chave da API armazenada no armazenamento sincronizado do Chrome.
   * @returns {Promise<string|null>} - A chave da API ou null se não estiver definida.
   */
  function getApiKey() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['openAIApiKey'], (data) => {
        if (data.openAIApiKey) {
          resolve(data.openAIApiKey);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Salva a chave da API no armazenamento sincronizado do Chrome.
   * @param {string} apiKey - A chave da API a ser salva.
   * @returns {Promise<void>}
   */
  function saveApiKey(apiKey) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ openAIApiKey: apiKey }, () => {
        resolve();
      });
    });
  }

  /**
   * Busca os modelos disponíveis da OpenAI utilizando a API.
   * @returns {Promise<boolean>} - Retorna true se a busca for bem-sucedida, caso contrário, false.
   */
  async function fetchModels() {
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('Chave da OpenAI não está salva.');
      return false; // Indica falha na obtenção da chave
    }

    updateStatus('working');

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter modelos da OpenAI. Chave inválida ou sem permissões.');
      }

      const data = await response.json();
      const models = data.data.map(model => model.id);
      const gptModels = models.filter(model => model.startsWith('gpt')); // Filtra modelos que começam com 'gpt'

      populateModelOptions(gptModels);
      updateStatus('completed');
      return true; // Indica sucesso na busca
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      alert(`Erro ao buscar modelos: ${error.message}`);
      updateStatus('error', error.message);
      return false; // Indica falha na busca
    }
  }

  /**
   * Popula as opções de modelos no seletor de modelos.
   * @param {string[]} models - Array de IDs de modelos disponíveis.
   */
  function populateModelOptions(models) {
    modelSelect.innerHTML = ''; // Limpa as opções existentes
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    // Atualiza o modelo selecionado com base no armazenamento
    chrome.storage.sync.get(['selectedModel'], (data) => {
      const selectedModel = data.selectedModel || models[0];
      modelSelect.value = selectedModel;
      selectedModelSpan.textContent = selectedModel;
    });
  }

  /**
   * Obtém o modelo atualmente selecionado pelo usuário.
   * @returns {Promise<string>} - O ID do modelo selecionado.
   */
  function getSelectedModel() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['selectedModel'], (data) => {
        resolve(data.selectedModel || 'gpt-3.5-turbo');
      });
    });
  }

  /**
   * Salva o resumo gerado para uma URL específica no armazenamento local.
   * @param {string} url - A URL da página resumida.
   * @param {string} summary - O texto do resumo.
   */
  function saveSummary(url, summary) {
    chrome.storage.local.get(['summaries'], (data) => {
      const summaries = data.summaries || {};
      const today = new Date().toISOString().split('T')[0];
      if (!summaries[url]) {
        summaries[url] = {};
      }
      summaries[url][today] = { summary: summary };
      chrome.storage.local.set({ summaries: summaries }, () => {
        console.log('Resumo salvo com sucesso.');
      });
    });
  }

  /**
   * Carrega as vozes disponíveis para síntese de voz.
   * @returns {Promise<void>}
   */
  function loadVoices() {
    return new Promise((resolve) => {
      let voicesLoaded = false;

      /**
       * Handler para o evento de mudança de vozes.
       */
      const voicesChanged = () => {
        voices = speechSynthesis.getVoices();
        if (voices.length !== 0) {
          voicesLoaded = true;
          populateVoices(summaryLanguageSelect.value);
          resolve();
        }
      };

      speechSynthesis.onvoiceschanged = voicesChanged; // Registra o handler

      // Tentativa inicial de carregar vozes
      voicesChanged();

      // Fallback caso onvoiceschanged não seja acionado dentro de 1 segundo
      setTimeout(() => {
        if (!voicesLoaded) {
          voices = speechSynthesis.getVoices();
          if (voices.length !== 0) {
            populateVoices(summaryLanguageSelect.value);
          } else {
            alert('Não foi possível carregar as vozes do sistema.');
          }
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Popula as opções de vozes no seletor de vozes com base no idioma selecionado.
   * @param {string} language - Código do idioma selecionado (e.g., 'pt-BR').
   */
  function populateVoices(language) {
    voiceSelect.innerHTML = ''; // Limpa as opções existentes
    const languageCode = language.split('-')[0];
    const filteredVoices = voices.filter(voice => voice.lang.startsWith(languageCode));
    if (filteredVoices.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Nenhuma voz disponível para este idioma.';
      option.disabled = true;
      voiceSelect.appendChild(option);
      return;
    }
    filteredVoices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    // Seleciona a voz previamente armazenada ou a primeira disponível
    chrome.storage.sync.get(['selectedVoice'], (data) => {
      const selectedVoice = data.selectedVoice || filteredVoices[0].name;
      if (filteredVoices.find(voice => voice.name === selectedVoice)) {
        voiceSelect.value = selectedVoice;
      }
    });
  }

  /**
   * Realiza a síntese de voz do texto do resumo utilizando as configurações selecionadas.
   */
  function speakSummary() {
    const text = summaryDiv.textContent;
    if (!text) {
      alert('Não há resumo para falar.');
      return;
    }

    const selectedVoiceName = voiceSelect.value;
    const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = parseFloat(voiceRate.value);
    utterance.volume = parseFloat(voiceVolume.value);
    speechSynthesis.speak(utterance); // Inicia a síntese de voz
  }

  /**
   * Utiliza a API da OpenAI para resumir o texto fornecido.
   * @param {string} text - O texto a ser resumido.
   * @param {string} model - O modelo da OpenAI a ser utilizado.
   * @param {number} maxTokens - O número máximo de tokens para o resumo.
   * @param {string} language - O idioma do resumo.
   * @param {number} detailLevel - O nível de detalhamento do resumo (1: Bem Resumido, 2: Resumido, 3: Super Detalhado).
   * @returns {Promise<string>} - O texto resumido.
   */
  async function summarizeText(text, model, maxTokens, language, detailLevel) {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('Chave da OpenAI não está salva.');
    }

    // Mapeamento de códigos de idioma para nomes e templates
    const languageMappings = {
      'pt-BR': {
        promptLanguage: 'português (Brasil)',
        promptTemplate: 'Resuma o seguinte texto em',
        detailLevels: {
          1: 'uma frase',
          2: 'um parágrafo',
          3: 'um texto detalhado'
        }
      },
      'en-US': {
        promptLanguage: 'inglês (Estados Unidos)',
        promptTemplate: 'Summarize the following text in',
        detailLevels: {
          1: 'one sentence',
          2: 'one paragraph',
          3: 'a detailed text'
        }
      },
      'es-ES': {
        promptLanguage: 'espanhol (Espanha)',
        promptTemplate: 'Resume el siguiente texto en',
        detailLevels: {
          1: 'una frase',
          2: 'un párrafo',
          3: 'un texto detallado'
        }
      }
      // Adicione mais mapeamentos de idiomas conforme necessário
    };

    // Obtém as configurações de idioma selecionadas
    const selectedLanguage = languageMappings[language];
    if (!selectedLanguage) {
      throw new Error('Idioma selecionado não suportado.');
    }

    // Ajusta maxTokens com base no nível de detalhamento
    let adjustedMaxTokens = maxTokens;
    switch(detailLevel) {
      case 1: // Bem Resumido
        adjustedMaxTokens = Math.floor(maxTokens * 0.5);
        break;
      case 2: // Resumido
        adjustedMaxTokens = maxTokens;
        break;
      case 3: // Super Detalhado
        adjustedMaxTokens = Math.floor(maxTokens * 1.5);
        break;
      default:
        adjustedMaxTokens = maxTokens;
    }

    // Construção do prompt para a API da OpenAI
    const prompt = `${selectedLanguage.promptTemplate} ${selectedLanguage.detailLevels[detailLevel]} ${selectedLanguage.promptLanguage}:\n\n${text}`;

    // Chamada à API da OpenAI para obtenção do resumo
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: adjustedMaxTokens,
        temperature: 0.5,
        n: 1,
        stop: null
      })
    });

    // Verifica a resposta da API
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error ? errorData.error.message : 'Falha na comunicação com a API da OpenAI.';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim(); // Retorna o resumo gerado
  }

  /**
   * Verifica se já existe um resumo para a URL atual e exibe o botão correspondente.
   * @param {string} url - A URL da página a ser verificada.
   */
  async function checkExistingSummary(url) {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(['summaries'], (data) => {
      const summaries = data.summaries || {};
      const existingSummary = summaries[url] ? summaries[url][today]?.summary : null;

      if (existingSummary) {
        // Exibe o botão 'Abrir Resumo Existente' se houver um resumo
        openExistingSummaryButton.style.display = 'block';
      } else {
        openExistingSummaryButton.style.display = 'none';
      }
    });
  }

  /**
   * Inicializa a extensão quando o popup é aberto.
   */
  async function initializeOnOpen() {
    const apiKey = await getApiKey();
    if (apiKey) {
      apiKeySection.style.display = 'none'; // Oculta a seção da chave API
      extensionContent.style.display = 'block'; // Exibe o conteúdo da extensão
      modifyApiKeyButton.style.display = 'block'; // Mostra o botão para modificar a chave
      const fetchSuccess = await fetchModels(); // Busca os modelos disponíveis

      if (!fetchSuccess) {
        // Se a busca por modelos falhar, exibe novamente a seção da chave API
        apiKeySection.style.display = 'block';
        extensionContent.style.display = 'none';
        modifyApiKeyButton.style.display = 'none';
        return;
      }

      // Obtém a aba ativa e verifica se já existe um resumo
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          alert('Nenhuma aba ativa encontrada.');
          return;
        }

        const tab = tabs[0];
        const url = tab.url;
        checkExistingSummary(url);
      });
    } else {
      // Se a chave da API não estiver salva, exibe a seção para inserção
      apiKeySection.style.display = 'block';
      extensionContent.style.display = 'none';
      modifyApiKeyButton.style.display = 'none'; // Esconde o botão de modificar chave
    }

    // Inicializa o controle de detalhamento do resumo
    initializeSummaryDetail();
  }

  /**
   * Inicializa o controle de detalhamento do resumo.
   */
  function initializeSummaryDetail() {
    updateSummaryDetailValue(summaryDetail.value); // Atualiza o valor exibido
  }

  /**
   * Atualiza a exibição do nível de detalhamento com base no valor do controle.
   * @param {string} value - O valor atual do controle de detalhamento.
   */
  function updateSummaryDetailValue(value) {
    switch(value) {
      case '1':
        summaryDetailValue.textContent = 'Bem Resumido';
        break;
      case '2':
        summaryDetailValue.textContent = 'Resumido';
        break;
      case '3':
        summaryDetailValue.textContent = 'Super Detalhado';
        break;
      default:
        summaryDetailValue.textContent = 'Resumido';
    }
  }

  // Evento para salvar a chave da API quando o botão é clicado
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = openAIApiKeyInput.value.trim();
    if (!apiKey) {
      alert('Por favor, insira uma chave da OpenAI válida.');
      return;
    }

    updateStatus('working'); // Atualiza o status para 'trabalhando'

    await saveApiKey(apiKey); // Salva a chave da API
    const fetchSuccess = await fetchModels(); // Busca os modelos disponíveis

    if (fetchSuccess) {
      apiKeySection.style.display = 'none'; // Oculta a seção da chave API
      extensionContent.style.display = 'block'; // Exibe o conteúdo da extensão
      modifyApiKeyButton.style.display = 'block'; // Mostra o botão para modificar a chave
      // Obtém a aba ativa e verifica se já existe um resumo
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          alert('Nenhuma aba ativa encontrada.');
          return;
        }

        const tab = tabs[0];
        const url = tab.url;
        checkExistingSummary(url);
      });
    } else {
      // Se a busca por modelos falhar, mantém a seção da chave API visível
      apiKeySection.style.display = 'block';
      extensionContent.style.display = 'none';
      modifyApiKeyButton.style.display = 'none'; // Esconde o botão de modificar chave
    }
  });

  // Evento para modificar a chave da API quando o botão é clicado
  modifyApiKeyButton.addEventListener('click', () => {
    // Exibe a seção da chave API
    apiKeySection.style.display = 'block';
    
    // Oculta outras seções
    extensionContent.style.display = 'none';
    completedFrame.style.display = 'none';
    
    // Oculta o botão de modificar chave enquanto está na tela de API Key
    modifyApiKeyButton.style.display = 'none';
  });

  // Evento para atualizar os modelos disponíveis quando o botão é clicado
  refreshModelsButton.addEventListener('click', async () => {
    await fetchModels(); // Busca novamente os modelos disponíveis
  });

  // Evento para criar um novo resumo quando o botão é clicado
  createNewSummaryButton.addEventListener('click', async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('Chave da OpenAI não está salva.');
      return;
    }
    extensionContent.style.display = 'none'; // Oculta o conteúdo da extensão
    await createSummary(); // Inicia o processo de criação do resumo
  });

  /**
   * Cria um resumo utilizando a API da OpenAI e exibe-o na interface.
   */
  async function createSummary() {
    updateStatus('working'); // Atualiza o status para 'trabalhando'
    try {
      // Obtém a aba ativa
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;

      // Injeta o script de conteúdo na aba ativa
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });

      // Envia uma mensagem para o script de conteúdo para obter o texto da página
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: "getText" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Não foi possível comunicar com o script de conteúdo.'));
          } else {
            resolve(response);
          }
        });
      });

      if (!response || !response.text) {
        throw new Error('Não foi possível obter o texto da página.');
      }

      const text = response.text;

      // Obtém as configurações selecionadas pelo usuário
      const model = await getSelectedModel();
      const language = summaryLanguageSelect.value;
      const detailLevel = parseInt(summaryDetail.value, 10);

      // Define o número base de tokens para a API
      const baseMaxTokens = 500;

      // Chama a função para resumir o texto usando a API da OpenAI
      const summary = await summarizeText(text, model, baseMaxTokens, language, detailLevel);

      // Exibe o resumo na interface
      summaryDiv.textContent = summary;

      // Salva o resumo no armazenamento local
      saveSummary(url, summary);

      // Mostra o frame concluído e atualiza o status para 'concluído'
      completedFrame.style.display = 'block';
      updateStatus('completed');
      await loadVoices(); // Carrega as vozes disponíveis para síntese
    } catch (error) {
      console.error('Erro ao resumir o texto:', error);
      alert(`Erro: ${error.message}`);
      updateStatus('error', error.message);
      // Se o erro estiver relacionado à chave da API, retorna para a tela de inserção da chave
      if (error.message.includes('Authorization') || error.message.includes('Chave inválida')) {
        apiKeySection.style.display = 'block';
        extensionContent.style.display = 'none';
        modifyApiKeyButton.style.display = 'none';
      }
    }
  }

  // Evento para abrir um resumo existente quando o botão é clicado
  openExistingSummaryButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        alert('Nenhuma aba ativa encontrada.');
        return;
      }

      const tab = tabs[0];
      const url = tab.url;
      const today = new Date().toISOString().split('T')[0];
      chrome.storage.local.get(['summaries'], (data) => {
        const summaries = data.summaries || {};
        const existingSummary = summaries[url] ? summaries[url][today]?.summary : null;

        if (existingSummary) {
          summaryDiv.textContent = existingSummary; // Exibe o resumo existente
          completedFrame.style.display = 'block'; // Mostra o frame concluído
          extensionContent.style.display = 'none'; // Oculta o conteúdo da extensão
          updateStatus('completed'); // Atualiza o status para 'concluído'
          loadVoices(); // Carrega as vozes disponíveis para síntese
        } else {
          alert('Nenhum resumo existente encontrado.');
        }
      });
    });
  });

  // Evento para falar o resumo quando o botão é clicado
  speakSummaryButton.addEventListener('click', () => {
    speakSummary(); // Chama a função para síntese de voz
  });

  // Evento para atualizar o valor da velocidade da voz conforme o controle é ajustado
  voiceRate.addEventListener('input', () => {
    rateValue.textContent = voiceRate.value; // Atualiza a exibição do valor da velocidade
  });

  // Evento para atualizar o valor do volume da voz conforme o controle é ajustado
  voiceVolume.addEventListener('input', () => {
    volumeValue.textContent = voiceVolume.value; // Atualiza a exibição do valor do volume
  });

  // Evento para alterar as vozes disponíveis quando o idioma do resumo é alterado
  summaryLanguageSelect.addEventListener('change', () => {
    const selectedLanguage = summaryLanguageSelect.value;
    chrome.storage.sync.set({ voiceLanguage: selectedLanguage }); // Salva o idioma selecionado
    populateVoices(selectedLanguage); // Atualiza as vozes disponíveis
  });

  // Evento para atualizar o nível de detalhamento do resumo conforme o controle é ajustado
  summaryDetail.addEventListener('input', () => {
    updateSummaryDetailValue(summaryDetail.value); // Atualiza a exibição do nível de detalhamento
  });

  // Evento para voltar à criação de resumo quando o botão é clicado
  backToStartButton.addEventListener('click', () => {
    completedFrame.style.display = 'none'; // Oculta o frame concluído
    extensionContent.style.display = 'block'; // Exibe o conteúdo da extensão
    summaryDiv.textContent = ''; // Limpa o conteúdo do resumo
    updateStatus('idle'); // Atualiza o status para 'nenhuma ação'

    // Verifica se existe um resumo existente para a aba atual
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        return;
      }
      const tab = tabs[0];
      const url = tab.url;
      checkExistingSummary(url);
    });
  });

  // Evento para alternar entre tema claro e escuro quando o botão é clicado
  toggleThemeButton.addEventListener('click', () => {
    document.documentElement.classList.toggle('light'); // Alterna a classe 'light' no elemento raiz
    const isLight = document.documentElement.classList.contains('light'); // Verifica se o tema claro está ativo
    chrome.storage.sync.set({ isLight: isLight }, () => {
      console.log(`Tema alterado para: ${isLight ? 'Claro' : 'Escuro'}`);
    });
  });

  // Inicializa a extensão quando o popup é carregado
  await initializeOnOpen();
});