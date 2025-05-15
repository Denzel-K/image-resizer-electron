// DOM Elements
const batchImagesInput = document.getElementById('batch-images');
const selectedFilesContainer = document.getElementById('selected-files-container');
const selectedFiles = document.getElementById('selected-files');
const fileCount = document.getElementById('file-count');
const batchOperation = document.getElementById('batch-operation');
const outputFormat = document.getElementById('batch-output-format');
const resizeOptions = document.getElementById('resize-options');
const compressionOptions = document.getElementById('compression-options');
const widthInput = document.getElementById('batch-width');
const heightInput = document.getElementById('batch-height');
const maintainAspectRatio = document.getElementById('maintain-aspect-ratio');
const compressionLevel = document.getElementById('compression-level');
const compressionValue = document.getElementById('compression-value');
const outputPath = document.getElementById('batch-output-path');
const changeOutputBtn = document.getElementById('batch-change-output');
const overwriteExisting = document.getElementById('overwrite-existing');
const startBatchBtn = document.getElementById('start-batch');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');
const progressPercentage = document.getElementById('progress-percentage');

// Global variables
let selectedImageFiles = [];
let aspectRatio = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get default output path from settings
  ipcRenderer.send('settings:get');
  
  // Listen for settings response
  ipcRenderer.on('settings:response', (settings) => {
    outputPath.value = settings.outputPath || path.join(os.homedir(), 'pixelcraft-studio');
  });
  
  // Operation type change
  batchOperation.addEventListener('change', () => {
    if (batchOperation.value === 'resize') {
      resizeOptions.classList.remove('hidden');
      compressionOptions.classList.add('hidden');
    } else if (batchOperation.value === 'compress') {
      resizeOptions.classList.add('hidden');
      compressionOptions.classList.remove('hidden');
    } else {
      resizeOptions.classList.add('hidden');
      compressionOptions.classList.add('hidden');
    }
  });
  
  // Compression level slider
  compressionLevel.addEventListener('input', () => {
    compressionValue.textContent = `${compressionLevel.value}%`;
  });
  
  // Maintain aspect ratio
  widthInput.addEventListener('input', () => {
    if (maintainAspectRatio.checked && aspectRatio > 0 && widthInput.value.trim() !== '') {
      const newWidth = parseInt(widthInput.value);
      const newHeight = Math.round(newWidth / aspectRatio);
      heightInput.value = newHeight;
    }
  });
  
  heightInput.addEventListener('input', () => {
    if (maintainAspectRatio.checked && aspectRatio > 0 && heightInput.value.trim() !== '') {
      const newHeight = parseInt(heightInput.value);
      const newWidth = Math.round(newHeight * aspectRatio);
      widthInput.value = newWidth;
    }
  });
  
  // Change output directory
  changeOutputBtn.addEventListener('click', () => {
    ipcRenderer.send('settings:select-output-path');
  });
  
  // Listen for new output path
  ipcRenderer.on('settings:output-path-selected', (outputDir) => {
    outputPath.value = outputDir;
  });
  
  // File selection
  batchImagesInput.addEventListener('change', handleFileSelection);
  
  // Start batch processing
  startBatchBtn.addEventListener('click', startBatchProcessing);
  
  // Listen for batch processing updates
  ipcRenderer.on('batch:progress', (data) => {
    updateProgress(data);
  });
  
  // Listen for batch processing completion
  ipcRenderer.on('batch:complete', () => {
    progressStatus.textContent = 'Processing complete!';
    progressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    
    // Show success message
    alertSuccess('Batch processing completed successfully!');
    
    // Reset UI after 3 seconds
    setTimeout(() => {
      progressSection.classList.add('hidden');
      startBatchBtn.disabled = false;
    }, 3000);
  });
  
  // Listen for batch processing errors
  ipcRenderer.on('batch:error', (error) => {
    progressStatus.textContent = 'Error occurred';
    alertError(`Error: ${error}`);
    startBatchBtn.disabled = false;
  });
});

// Handle file selection
function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  
  if (files.length === 0) {
    return;
  }
  
  // Filter for image files
  selectedImageFiles = files.filter(file => {
    const acceptedImageTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];
    return acceptedImageTypes.includes(file.type);
  });
  
  if (selectedImageFiles.length === 0) {
    alertError('No valid image files selected');
    return;
  }
  
  // Update UI
  fileCount.textContent = `${selectedImageFiles.length} files`;
  selectedFilesContainer.classList.remove('hidden');
  selectedFiles.innerHTML = '';
  
  // Display selected files
  selectedImageFiles.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'flex items-center justify-between py-1 border-b border-gray-100';
    fileItem.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-file-image text-teal-500 mr-2"></i>
        <span class="text-sm">${file.name}</span>
      </div>
      <span class="text-xs text-gray-500">${formatFileSize(file.size)}</span>
    `;
    selectedFiles.appendChild(fileItem);
  });
  
  // Get dimensions of first image for aspect ratio
  if (selectedImageFiles.length > 0) {
    const image = new Image();
    image.src = URL.createObjectURL(selectedImageFiles[0]);
    image.onload = function() {
      aspectRatio = this.width / this.height;
      
      // Enable start button
      startBatchBtn.disabled = false;
    };
  }
}

// Start batch processing
function startBatchProcessing() {
  if (selectedImageFiles.length === 0) {
    alertError('No files selected');
    return;
  }
  
  // Disable start button
  startBatchBtn.disabled = true;
  
  // Show progress section
  progressSection.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressStatus.textContent = 'Starting...';
  progressPercentage.textContent = '0%';
  
  // Prepare options
  const options = {
    operation: batchOperation.value,
    outputFormat: outputFormat.value,
    outputPath: outputPath.value,
    overwrite: overwriteExisting.checked,
    files: selectedImageFiles.map(file => file.path),
    compression: parseInt(compressionLevel.value),
    resize: {
      width: widthInput.value ? parseInt(widthInput.value) : null,
      height: heightInput.value ? parseInt(heightInput.value) : null,
      maintainAspectRatio: maintainAspectRatio.checked
    }
  };
  
  // Send to main process
  ipcRenderer.send('batch:process', options);
}

// Update progress UI
function updateProgress(data) {
  const { current, total, filename } = data;
  const percentage = Math.round((current / total) * 100);
  
  progressBar.style.width = `${percentage}%`;
  progressStatus.textContent = `Processing ${filename} (${current}/${total})`;
  progressPercentage.textContent = `${percentage}%`;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Alert functions
function alertSuccess(message) {
  Toastify.toast({
    text: message,
    duration: 5000,
    close: false,
    style: {
      background: 'green',
      color: 'white',
      textAlign: 'center',
    },
  });
}

function alertError(message) {
  Toastify.toast({
    text: message,
    duration: 5000,
    close: false,
    style: {
      background: 'red',
      color: 'white',
      textAlign: 'center',
    },
  });
}
