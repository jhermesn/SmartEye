function getPageText() {
  const mainElement = document.querySelector('main');
  if (mainElement) {
    return mainElement.innerText;
  }
  return document.body.innerText;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getText") {
    const text = getPageText();
    sendResponse({ text });
  }
});