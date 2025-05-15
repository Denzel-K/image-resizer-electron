const form = document.querySelector('#img-form');
const img = document.querySelector('#img');
const outputPath = document.querySelector('#output-path');
const filename = document.querySelector('#filename');
const heightInput = document.querySelector('#height');
const widthInput = document.querySelector('#width');
const fileInfo = document.querySelector('#file-info');

// Global variable to store original image dimensions
let originalWidth = 0;
let originalHeight = 0;
let aspectRatio = 0;

// Load image and show form
function loadImage(e) {
  const file = e.target.files[0];

  // Check if file is an image
  if (!isFileImage(file)) {
    alertError('Please select an image');
    return;
  }

  // Add current height and width to form using the URL API
  const image = new Image();
  image.src = URL.createObjectURL(file);
  image.onload = function () {
    originalWidth = this.width;
    originalHeight = this.height;
    aspectRatio = originalWidth / originalHeight;

    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
  };

  // Show form, image name and output path
  form.classList.remove('hidden');
  fileInfo.classList.remove('hidden');
  filename.innerHTML = img.files[0].name;
  outputPath.innerText = path.join(os.homedir(), 'pixelcraft-studio');
}

// Make sure file is an image
function isFileImage(file) {
  const acceptedImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
  return file && acceptedImageTypes.includes(file['type']);
}

// Maintain aspect ratio when width changes
function updateHeight() {
  if (aspectRatio > 0 && widthInput.value.trim() !== '') {
    const newWidth = parseInt(widthInput.value);
    const newHeight = Math.round(newWidth / aspectRatio);
    heightInput.value = newHeight;
  }
}

// Maintain aspect ratio when height changes
function updateWidth() {
  if (aspectRatio > 0 && heightInput.value.trim() !== '') {
    const newHeight = parseInt(heightInput.value);
    const newWidth = Math.round(newHeight * aspectRatio);
    widthInput.value = newWidth;
  }
}

// Resize image
function resizeImage(e) {
  e.preventDefault();

  if (!img.files[0]) {
    alertError('Please upload an image');
    return;
  }

  // Allow resizing with just one dimension specified
  if (widthInput.value === '' && heightInput.value === '') {
    alertError('Please enter at least one dimension (width or height)');
    return;
  }

  // If only one dimension is provided, calculate the other
  if (widthInput.value === '' && heightInput.value !== '') {
    updateWidth();
  } else if (heightInput.value === '' && widthInput.value !== '') {
    updateHeight();
  }

  // Electron adds a bunch of extra properties to the file object including the path
  const imgPath = img.files[0].path;
  const width = widthInput.value;
  const height = heightInput.value;

  ipcRenderer.send('image:resize', {
    imgPath,
    height,
    width,
  });
}

// When done, show message
ipcRenderer.on('image:done', () =>
  alertSuccess(`Image resized to ${heightInput.value} x ${widthInput.value}`)
);

// Handle errors
ipcRenderer.on('image:error', (error) =>
  alertError(`Error: ${error}`)
);

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

// File select listener
img.addEventListener('change', loadImage);
// Form submit listener
form.addEventListener('submit', resizeImage);
// Width input listener for maintaining aspect ratio
widthInput.addEventListener('input', updateHeight);
// Height input listener for maintaining aspect ratio
heightInput.addEventListener('input', updateWidth);
