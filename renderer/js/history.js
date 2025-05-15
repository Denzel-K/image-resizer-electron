// DOM Elements
const historyList = document.getElementById('history-items');
const noHistory = document.getElementById('no-history');
const clearHistoryBtn = document.getElementById('clear-history');

// Load history from electron-store
document.addEventListener('DOMContentLoaded', () => {
  // Request history from main process
  ipcRenderer.send('history:get');

  // Listen for history data
  ipcRenderer.on('history:response', (history) => {
    renderHistory(history);
  });

  // Clear history button
  clearHistoryBtn.addEventListener('click', () => {
    ipcRenderer.send('history:clear');
    renderHistory([]);
  });
});

// Open folder when clicking on history item
function openFolder(path) {
  ipcRenderer.send('open:folder', path);
}

// Open file directly
function openFile(filePath) {
  ipcRenderer.send('open:file', filePath);
}

// Render history items
function renderHistory(history) {
  if (!history || history.length === 0) {
    noHistory.style.display = 'block';
    historyList.innerHTML = '';
    return;
  }

  noHistory.style.display = 'none';
  historyList.innerHTML = '';

  history.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.style.animationDelay = `${index * 0.05}s`;

    li.innerHTML = `
      <div class="history-item-content">
        <div class="history-item-icon">
          <i class="fas fa-image"></i>
        </div>
        <div class="history-item-details">
          <p class="history-item-filename">${item.filename}</p>
          <p class="history-item-dimensions">Resized to ${item.width} x ${item.height}</p>
          <p class="history-item-timestamp">${new Date(item.timestamp).toLocaleString()}</p>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="history-action-btn open-file" title="Open file" onclick="openFile('${item.fullFilePath || path.join(item.outputPath, item.filename)}')">
          <i class="fas fa-file-image"></i>
        </button>
        <button class="history-action-btn open-folder" title="Open containing folder" onclick="openFolder('${item.outputPath}')">
          <i class="fas fa-folder-open"></i>
        </button>
      </div>
    `;

    historyList.appendChild(li);
  });
}
