// content.js

// Log para indicar que o script foi injetado na página
console.log("content.js injetado na página.");

/**
 * Obtém o texto visível da página.
 * @returns {string} - O texto do corpo da página.
 */
function getPageText() {
  return document.body.innerText; // Retorna o texto do corpo da página
}

// Listener para receber mensagens do popup ou background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Mensagem recebida no content.js:", request);
  if (request.action === "getText") {
    const text = getPageText(); // Obtém o texto da página
    console.log("Texto obtido da página:", text.substring(0, 100) + "..."); // Log dos primeiros 100 caracteres
    sendResponse({ text: text }); // Envia o texto de volta
  }
});