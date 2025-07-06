// script.js

// --- DOM refs ---
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const fileBtn = document.getElementById("file-btn");
const preview = document.getElementById("preview");
const minusCol = document.getElementById("minus-col");
const plusCol = document.getElementById("plus-col");
const colCount = document.getElementById("col-count");
const splitBtn = document.getElementById("split-btn");
const previewContainer = document.getElementById("slice-previews");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const resetBtn = document.getElementById("reset-btn");
const workspace = document.getElementById("workspace");

let img = new Image();
let columns = 3;
const GUIDE_OVERFLOW = 80;

// Hide progress UI on load
progressContainer.classList.remove("active");

// Helper to read current aspect‐ratio radio value
function getAspectValue() {
  return document.querySelector('input[name="aspect"]:checked').value;
}

// --- Seam warning logic ---
function checkSeamlessSplitWarning() {
  const warning = document.getElementById("seam-warning");
  if (!img.naturalWidth || !img.naturalHeight) return;

  const [targetW, targetH] = getAspectValue().split("x").map(Number);
  const imageAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetW / targetH;
  const minColumns = Math.ceil(imageAspect / targetAspect);

  if (columns < minColumns) {
    warning.hidden = false;
    warning.textContent = `⚠️ You should use at least ${minColumns} column${minColumns > 1 ? "s" : ""}.`;
  } else {
    warning.hidden = true;
  }
}

// --- Drag & drop handlers ---
function onDragOver(e) {
  e.preventDefault();
  dropArea.classList.add("dragover");
}
function onDragLeave(e) {
  e.preventDefault();
  dropArea.classList.remove("dragover");
}

dropArea.addEventListener("dragenter", onDragOver);
dropArea.addEventListener("dragover", onDragOver);
dropArea.addEventListener("dragleave", onDragLeave);
dropArea.addEventListener("drop", e => {
  e.preventDefault();
  onDragLeave(e);
  if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
});

// --- File upload button ---
fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => {
  if (e.target.files.length) loadFile(e.target.files[0]);
});

// --- Load image & size canvas ---
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      preview.width = img.naturalWidth;
      preview.height = img.naturalHeight + 2 * GUIDE_OVERFLOW;
      drawPreview();
      splitBtn.disabled = false;

      dropArea.classList.add("hidden");
      workspace.classList.add("visible");
      document.querySelector(".logo")?.classList.add("shrink");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  checkSeamlessSplitWarning();
}

// --- Draw preview + guides ---
function drawPreview() {
  preview.width = img.naturalWidth;
  preview.height = img.naturalHeight + 2 * GUIDE_OVERFLOW;

  const ctx = preview.getContext("2d");
  const cs = getComputedStyle(preview);
  const color = cs.getPropertyValue("--main-accent").trim() || "rgba(255,255,255,0.8)";
  const guideWidthCSS = parseFloat(cs.getPropertyValue("--guide-width")) || 2;

  const displayWidth = preview.clientWidth;
  const scaleFactor = preview.width / displayWidth;
  const adjustedLineWidth = guideWidthCSS * scaleFactor;

  ctx.clearRect(0, 0, preview.width, preview.height);
  ctx.drawImage(img, 0, GUIDE_OVERFLOW, img.naturalWidth, img.naturalHeight);

  ctx.strokeStyle = color;
  ctx.lineWidth = adjustedLineWidth;

  for (let i = 1; i < columns; i++) {
    const x = (preview.width / columns) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, preview.height);
    ctx.stroke();
  }

  updateSlicePreviews();
  checkSeamlessSplitWarning();
}

// --- Thumbnails preview ---
function updateSlicePreviews() {
  previewContainer.innerHTML = "";
  const [targetW, targetH] = getAspectValue().split("x").map(Number);
  const sliceW = img.naturalWidth / columns;
  const sliceH = img.naturalHeight;

  for (let i = 0; i < columns; i++) {
    const thumb = document.createElement("canvas");
    const displaySize = 80;
    thumb.width = displaySize;
    thumb.height = Math.round(displaySize * (targetH / targetW));
    const tc = thumb.getContext("2d");

    const scale = Math.max(thumb.width / sliceW, thumb.height / sliceH);
    const dw = sliceW * scale;
    const dh = sliceH * scale;
    const dx = (thumb.width - dw) / 2;
    const dy = (thumb.height - dh) / 2;

    tc.drawImage(img, sliceW * i, 0, sliceW, sliceH, dx, dy, dw, dh);
    previewContainer.appendChild(thumb);
  }
}

// --- Column controls ---
minusCol.addEventListener("click", () => {
  if (columns > 2) {
    columns--;
    colCount.textContent = columns;
    drawPreview();
  }
});
plusCol.addEventListener("click", () => {
  if (columns < 10) {
    columns++;
    colCount.textContent = columns;
    drawPreview();
  }
});

// --- Radio change handlers (new aspect inputs) ---
document
  .querySelectorAll('input[name="aspect"]')
  .forEach(radio =>
    radio.addEventListener("change", () => {
      if (img.src) drawPreview();
    })
  );

// --- Split & download with progress ---
splitBtn.addEventListener("click", async () => {
  splitBtn.disabled = true;
  progressBar.value = 0;
  progressText.textContent = "0%";
  progressContainer.classList.add("active");

  const zip = new JSZip();
  const [, hStr] = getAspectValue().split("x");
  const targetH = Number(hStr);
  const sliceW = img.naturalWidth / columns;
  const sliceH = img.naturalHeight;

  for (let i = 0; i < columns; i++) {
    const off = document.createElement("canvas");
    off.width = 1080;
    off.height = targetH;
    const oc = off.getContext("2d");

    const scale = Math.max(1080 / sliceW, targetH / sliceH);
    const dw = sliceW * scale;
    const dh = sliceH * scale;
    const dx = (1080 - dw) / 2;
    const dy = (targetH - dh) / 2;

    oc.drawImage(img, sliceW * i, 0, sliceW, sliceH, dx, dy, dw, dh);
    const blob = await new Promise(res => off.toBlob(res, "image/jpeg", 0.9));
    zip.file(`${i + 1}.jpg`, blob);
  }

  zip.generateAsync({ type: "blob" }, meta => {
    const p = Math.floor(meta.percent);
    progressBar.value = p;
    progressText.textContent = p + "%";
  })
  .then(content => saveAs(content, "carousel.zip"))
  .finally(() => {
    progressContainer.classList.remove("active");
    splitBtn.disabled = false;
  });
});

// --- Reset button ---
resetBtn.addEventListener("click", () => {
  location.reload();
});
