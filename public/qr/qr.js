// Always encode the public redirector, including during local previews.
const origin = 'https://go.thebaycompassion.org';
const link = document.querySelector('#link');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const svgButton = document.querySelector('#svg');
const pngButton = document.querySelector('#png');
let code;
let svg;

function generate() {
  const url = origin + link.value;
  document.querySelector('#url').textContent = url;
  preview.replaceChildren();
  svgButton.disabled = pngButton.disabled = true;
  try {
    code = qrcode(0, 'M');
    code.addData(url, 'Byte');
    code.make();
    // Four modules of white space on every side are included in both exports.
    svg = code.createSvgTag({ cellSize: 8, margin: 32, scalable: true });
    preview.innerHTML = svg;
    status.textContent = 'Ready to download.';
    svgButton.disabled = pngButton.disabled = false;
  } catch (error) {
    status.textContent = 'Could not generate the QR code. Reload the page and try again.';
    console.error(error);
  }
}

function download(blob, extension, path = link.value) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bay-compassion-${path.split('/').filter(Boolean).join('-') || 'home'}.${extension}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

svgButton.addEventListener('click', () => {
  download(new Blob([svg], { type: 'image/svg+xml' }), 'svg');
});

pngButton.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  const modules = code.getModuleCount();
  // Integer-sized modules keep the exported pixels crisp (at least 1024px).
  const scale = Math.ceil(1024 / (modules + 8));
  canvas.width = canvas.height = (modules + 8) * scale;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (code.isDark(row, col)) {
        context.fillRect((col + 4) * scale, (row + 4) * scale, scale, scale);
      }
    }
  }
  // Capture the filename while this code is still selected.
  const selection = link.value;
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Could not export PNG. Try downloading SVG instead.';
      return;
    }
    download(blob, 'png', selection);
  }, 'image/png');
});

link.addEventListener('change', generate);
generate();
