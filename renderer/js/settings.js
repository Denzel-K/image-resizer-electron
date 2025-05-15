// DOM Elements
const settingsForm = document.getElementById('settings-form');
const outputPathInput = document.getElementById('output-path-input');
const changeOutputPathBtn = document.getElementById('change-output-path');
const defaultFormatSelect = document.getElementById('default-format');
const saveHistoryCheckbox = document.getElementById('save-history');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// Load settings from electron-store
document.addEventListener('DOMContentLoaded', () => {
  // Request settings from main process
  ipcRenderer.send('settings:get');
  
  // Listen for settings data
  ipcRenderer.on('settings:response', (settings) => {
    // Populate form with settings
    outputPathInput.value = settings.outputPath || path.join(os.homedir(), 'imageresizer');
    defaultFormatSelect.value = settings.defaultFormat || 'same';
    saveHistoryCheckbox.checked = settings.saveHistory !== false; // Default to true
  });
  
  // Change output path button
  changeOutputPathBtn.addEventListener('click', () => {
    ipcRenderer.send('settings:select-output-path');
  });
  
  // Listen for new output path
  ipcRenderer.on('settings:output-path-selected', (outputPath) => {
    outputPathInput.value = outputPath;
  });
  
  // Save settings
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const settings = {
      outputPath: outputPathInput.value,
      defaultFormat: defaultFormatSelect.value,
      saveHistory: saveHistoryCheckbox.checked
    };
    
    ipcRenderer.send('settings:save', settings);
    
    // Show success message
    Toastify.toast({
      text: 'Settings saved successfully',
      duration: 3000,
      close: false,
      style: {
        background: 'green',
        color: 'white',
        textAlign: 'center',
      },
    });
  });
  
  // Reset settings
  resetSettingsBtn.addEventListener('click', () => {
    ipcRenderer.send('settings:reset');
    
    // Show success message
    Toastify.toast({
      text: 'Settings reset to default',
      duration: 3000,
      close: false,
      style: {
        background: 'blue',
        color: 'white',
        textAlign: 'center',
      },
    });
  });
});
