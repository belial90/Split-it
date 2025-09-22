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
const resetBtn = document.getElementById("reset-btn");
const workspace = document.getElementById("workspace");
const description = document.getElementById("description");
const warningMsg = document.getElementById("seam-warning");
const successMsg = document.getElementById("seam-success");
const seamNote = document.getElementById("seam-note");
// NEW: Job-complete message
const jobComplete = document.querySelector(".job-complete");

let img = new Image();
let columns = 3;
const GUIDE_OVERFLOW = 80;

// hide progress UI on load
progressContainer.classList.remove("active");

// --- Helpers ---
function getAspectValue() {
  return document.querySelector('input[name="aspect"]:checked').value;
}

function getRecommendedColumns() {
  if (!img.naturalWidth || !img.naturalHeight) return 3;
  const [w, h] = getAspectValue().split("x").map(Number);
  const imageAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = w / h;
  return Math.ceil(imageAspect / targetAspect);
}

// show feedback: success / warning / note
function checkSeamlessSplitFeedback() {
  const minCols = getRecommendedColumns();
  [warningMsg, successMsg, seamNote].forEach((el) => {
    el.hidden = true;
    el.style.animation = "";
  });

  if (columns < minCols) {
    warningMsg.hidden = false;
    warningMsg.textContent = warningMsg.dataset.template.replace("{n}", minCols);
    requestAnimationFrame(() => {
      warningMsg.style.animation = "fadeBounce 0.4s ease-out forwards";
    });
  } else if (columns > minCols) {
    seamNote.hidden = false;
    seamNote.textContent = seamNote.dataset.template.replace("{n}", minCols);
    requestAnimationFrame(() => {
      seamNote.style.animation = "fadeBounce 0.4s ease-out forwards";
    });
  } else {
    successMsg.hidden = false;
    requestAnimationFrame(() => {
      successMsg.style.animation = "fadeBounce 0.4s ease-out forwards";
    });
  }
}

// enable/disable the ± buttons
function updateColumnButtons() {
  minusCol.classList.toggle("disabled", columns <= 2);
  plusCol.classList.toggle("disabled", columns >= 10);
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
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  onDragLeave(e);
  if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
});

// --- File upload button ---
fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) loadFile(e.target.files[0]);
});

// --- Load image & prepare preview ---
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      // reset any previous "job complete"
      jobComplete?.classList.add("hidden");

      // set recommended columns & UI
      columns = getRecommendedColumns();
      colCount.textContent = columns;
      updateColumnButtons();

      preview.width = img.naturalWidth;
      preview.height = img.naturalHeight + 2 * GUIDE_OVERFLOW;

      // defer draw until layout is applied
      requestAnimationFrame(() => {
        drawPreview();
      });

      splitBtn.disabled = false;
      description.classList.add("hidden");
      dropArea.classList.add("hidden");
      workspace.classList.add("visible");
      document.querySelector(".logo")?.classList.add("shrink");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// --- Draw main preview + guides ---
function drawPreview() {
  preview.width = img.naturalWidth;
  preview.height = img.naturalHeight + 2 * GUIDE_OVERFLOW;

  const ctx = preview.getContext("2d");
  const cs = getComputedStyle(preview);
  const color = cs.getPropertyValue("--main-accent").trim() || "#000";
  const gWidth = parseFloat(cs.getPropertyValue("--guide-width")) || 2;

  const displayW = preview.clientWidth || preview.width;
  const scaleFactor = preview.width / displayW;
  const lineWidth = gWidth * scaleFactor;

  ctx.clearRect(0, 0, preview.width, preview.height);
  ctx.drawImage(img, 0, GUIDE_OVERFLOW, img.naturalWidth, img.naturalHeight);

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (let i = 1; i < columns; i++) {
    const x = (preview.width / columns) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, preview.height);
    ctx.stroke();
  }

  updateSlicePreviews();
  checkSeamlessSplitFeedback();
}

// --- Thumbnail previews ---
function updateSlicePreviews() {
  previewContainer.innerHTML = "";
  const [w, h] = getAspectValue().split("x").map(Number);
  const sliceW = img.naturalWidth / columns;
  const sliceH = img.naturalHeight;
  const thumbSize = 160;

  for (let i = 0; i < columns; i++) {
    const thumb = document.createElement("canvas");
    thumb.width = thumbSize;
    thumb.height = Math.round(thumbSize * (h / w));

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
    updateColumnButtons();
  }
});
plusCol.addEventListener("click", () => {
  if (columns < 10) {
    columns++;
    colCount.textContent = columns;
    drawPreview();
    updateColumnButtons();
  }
});

// --- Aspect‐ratio change handler ---
document.querySelectorAll('input[name="aspect"]').forEach((radio) =>
  radio.addEventListener("change", () => {
    if (!img.src) return;
    columns = getRecommendedColumns();
    colCount.textContent = columns;
    drawPreview();
    updateColumnButtons();
  })
);

// --- Split & download ZIP + post‐job UI reset ---
splitBtn.addEventListener("click", async () => {
  splitBtn.disabled = true;
  progressBar.value = 0;
  progressContainer.classList.add("active");

  const zip = new JSZip();
  const [wStr, hStr] = getAspectValue().split("x");
  const targetW = Number(wStr);
  const targetH = Number(hStr);
  const sliceW = img.naturalWidth / columns;
  const sliceH = img.naturalHeight;

  // create slices
  for (let i = 0; i < columns; i++) {
    const off = document.createElement("canvas");
    off.width = targetW;
    off.height = targetH;
    const oc = off.getContext("2d");

    const scale = Math.max(targetW / sliceW, targetH / sliceH);
    const dw = sliceW * scale;
    const dh = sliceH * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;

    oc.drawImage(img, sliceW * i, 0, sliceW, sliceH, dx, dy, dw, dh);
    const blob = await new Promise((res) => off.toBlob(res, "image/jpeg", 1.0));
    zip.file(`${i + 1}.jpg`, blob);
  }

  // pack & save
  zip
    .generateAsync({ type: "blob" }, (meta) => {
      progressBar.value = Math.floor(meta.percent);
    })
    .then((content) => saveAs(content, "carousel.zip"))
    .finally(() => {
      progressContainer.classList.remove("active");
      splitBtn.disabled = false;

      // 1) hide workspace
      workspace.classList.remove("visible");
      // 2) show drop‐area & job‐complete message
      dropArea.classList.remove("hidden");
      document.querySelector(".logo")?.classList.remove("shrink");
      jobComplete?.classList.remove("hidden");
    });
});

// --- Reset page ---
resetBtn.addEventListener("click", () => {
  location.reload();
});