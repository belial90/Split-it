// script.js

// --- DOM refs ---
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const fileBtn = document.getElementById("file-btn");
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
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      // reset any previous "job complete"
      jobComplete?.classList.add("hidden");

      // auto-select aspect ratio based on image height
      const height = img.naturalHeight;
      let aspectValue;
      if (height === 1440) {
        aspectValue = "1080x1440"; // 3:4
      } else if (height === 1350) {
        aspectValue = "1080x1350"; // 4:5
      } else if (height === 1080) {
        aspectValue = "1080x1080"; // 1:1
      }

      if (aspectValue) {
        const aspectRadio = document.querySelector(`input[name="aspect"][value="${aspectValue}"]`);
        if (aspectRadio) {
          aspectRadio.checked = true;
        }
      }

      // set recommended columns & UI
      columns = getRecommendedColumns();
      colCount.textContent = columns;
      updateColumnButtons();

      // defer draw until layout is applied
      requestAnimationFrame(() => {
        updateSlicePreviews();
        checkSeamlessSplitFeedback();
      });

      splitBtn.disabled = false;
      description.classList.add("hidden");
      dropArea.classList.add("hidden");
      workspace.classList.add("visible");
      document.querySelector(".logo")?.classList.add("shrink");
    };
    img.onerror = () => {
      alert('Failed to load image. Please try a different file.');
    };
    img.src = reader.result;
  };
  reader.onerror = () => {
    alert('Failed to read file. Please try again.');
  };
  reader.readAsDataURL(file);
}

// --- Thumbnail previews ---
function updateSlicePreviews() {
  previewContainer.innerHTML = "";
  const [w, h] = getAspectValue().split("x").map(Number);
  const sliceW = img.naturalWidth / columns;
  const sliceH = img.naturalHeight;
  const previewHeight = 220;
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const renderScale = pixelRatio * 1.5;
  const displayWidth = Math.round(previewHeight * (w / h));
  const displayHeight = previewHeight;

  for (let i = 0; i < columns; i++) {
    const thumb = document.createElement("canvas");
    thumb.style.width = `${displayWidth}px`;
    thumb.style.height = `${displayHeight}px`;
    thumb.width = Math.round(displayWidth * renderScale);
    thumb.height = Math.round(displayHeight * renderScale);

    const tc = thumb.getContext("2d");
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = "high";

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
    updateSlicePreviews();
    checkSeamlessSplitFeedback();
    updateColumnButtons();
  }
});
plusCol.addEventListener("click", () => {
  if (columns < 10) {
    columns++;
    colCount.textContent = columns;
    updateSlicePreviews();
    checkSeamlessSplitFeedback();
    updateColumnButtons();
  }
});

// --- Aspect‐ratio change handler ---
document.querySelectorAll('input[name="aspect"]').forEach((radio) =>
  radio.addEventListener("change", () => {
    if (!img.src) return;
    columns = getRecommendedColumns();
    colCount.textContent = columns;
    updateSlicePreviews();
    checkSeamlessSplitFeedback();
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

/* if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
*/