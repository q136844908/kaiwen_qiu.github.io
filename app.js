const examples = {
  growth: {
    text: "Payroll employment continued to increase and the unemployment rate remained low, while inflation pressures eased further.",
    score: 0.9534,
    probabilities: [0.0146, 0.0175, 0.9679],
  },
  neutral: {
    text: "There was no clear change in overall economic conditions.",
    score: -0.0061,
    probabilities: [0.1711, 0.664, 0.1649],
  },
  downturn: {
    text: "Manufacturing activity contracted sharply as new orders declined and firms reported broad-based weakness in demand.",
    score: -0.9707,
    probabilities: [0.9798, 0.0111, 0.0091],
  },
};

const textArea = document.querySelector("#economic-text");
const analyzeButton = document.querySelector("#analyze-button");
const resultPanel = document.querySelector("#result-panel");
const notice = document.querySelector("#demo-notice");
const noticeTitle = document.querySelector("#demo-status-title");
const noticeDetail = document.querySelector("#demo-status-detail");
const progressBar = document.querySelector("#demo-progress-bar");
const tabs = [...document.querySelectorAll("[data-example]")];

let inferenceWorker;
let pendingInference;
let inferenceSequence = 0;

function setActiveTab(key) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.example === key;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
}

function normalizeResult(result) {
  if (!result || !Array.isArray(result.probabilities)) {
    throw new Error("Malformed inference response");
  }

  const probabilities = result.probabilities.map(Number);
  if (
    probabilities.length !== 3 ||
    probabilities.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error("Malformed inference probabilities");
  }

  const total = probabilities.reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw new Error("Empty inference probabilities");
  const normalized = probabilities.map((value) => value / total);

  return {
    probabilities: normalized,
    score: normalized[2] - normalized[0],
  };
}

function renderResult(rawResult) {
  const result = normalizeResult(rawResult);
  const [negative, neutral, positive] = result.probabilities;
  const labels = ["Negative", "Neutral", "Positive"];
  const winningIndex = result.probabilities.indexOf(
    Math.max(...result.probabilities),
  );
  const classification = labels[winningIndex];
  const scoreText = `${result.score > 0 ? "+" : ""}${result.score.toFixed(2)}`;

  document.querySelector("#score").textContent = scoreText;
  const classificationNode = document.querySelector("#classification");
  classificationNode.textContent = `● ${classification}`;
  classificationNode.className = `classification ${classification.toLowerCase()}`;
  document.querySelector("#score-marker").style.left =
    `${Math.min(100, Math.max(0, (result.score + 1) * 50))}%`;

  [
    ["negative", negative],
    ["neutral", neutral],
    ["positive", positive],
  ].forEach(([label, value]) => {
    document.querySelector(`#${label}-value`).textContent =
      `${Math.round(value * 100)}%`;
    document.querySelector(`#${label}-bar`).style.width = `${value * 100}%`;
  });

  notice.hidden = true;
  resultPanel.hidden = false;
}

function showNotice(title, detail, { error = false, progress } = {}) {
  noticeTitle.textContent = title;
  noticeDetail.textContent = detail;
  notice.classList.toggle("is-error", error);
  notice.hidden = false;

  if (Number.isFinite(progress)) {
    progressBar.parentElement.hidden = false;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  } else {
    progressBar.parentElement.hidden = true;
    progressBar.style.width = "0%";
  }
}

function rejectPendingInference(message) {
  if (!pendingInference) return;
  pendingInference.reject(new Error(message));
  pendingInference = null;
}

function getInferenceWorker() {
  if (inferenceWorker) return inferenceWorker;

  inferenceWorker = new Worker("econbert-worker.js", { type: "module" });
  inferenceWorker.addEventListener("message", ({ data }) => {
    if (!data || data.id !== pendingInference?.id) return;

    if (data.type === "status") {
      showNotice(data.title, data.detail, { progress: data.progress });
      return;
    }

    if (data.type === "result") {
      pendingInference.resolve(data.result);
      pendingInference = null;
      return;
    }

    if (data.type === "error") {
      rejectPendingInference(data.message || "Browser inference failed");
    }
  });
  inferenceWorker.addEventListener("error", () => {
    rejectPendingInference("The browser could not load the EconBERT model.");
    inferenceWorker.terminate();
    inferenceWorker = null;
  });

  return inferenceWorker;
}

function runBrowserInference(text) {
  const worker = getInferenceWorker();
  const id = ++inferenceSequence;
  return new Promise((resolve, reject) => {
    pendingInference = { id, resolve, reject };
    worker.postMessage({ id, type: "analyze", text });
  });
}

async function runApiInference(text) {
  const response = await fetch(window.ECONBERT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("Inference request failed");
  return response.json();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.example;
    textArea.value = examples[key].text;
    setActiveTab(key);
    renderResult(examples[key]);
  });
});

textArea.addEventListener("input", () => {
  const match = Object.entries(examples).find(
    ([, example]) => example.text.trim() === textArea.value.trim(),
  );
  setActiveTab(match ? match[0] : "");
});

analyzeButton.addEventListener("click", async () => {
  const text = textArea.value.trim();
  if (!text) {
    showNotice(
      "Enter an economic passage",
      "Paste or type text before running the model.",
      { error: true },
    );
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing…";

  const match = Object.values(examples).find(
    (example) => example.text.trim() === text,
  );

  try {
    if (match) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      renderResult(match);
    } else {
      resultPanel.hidden = true;
      showNotice(
        window.ECONBERT_API_URL ? "Contacting EconBERT" : "Loading EconBERT",
        window.ECONBERT_API_URL
          ? "Sending this passage to the configured model service."
          : "The browser model is about 65 MB and is cached after the first use.",
      );
      const result = window.ECONBERT_API_URL
        ? await runApiInference(text)
        : await runBrowserInference(text);
      renderResult(result);
    }
  } catch (error) {
    console.error("EconBERT inference error", error);
    resultPanel.hidden = true;
    showNotice(
      "Analysis unavailable",
      "The model could not load. Check your connection, refresh the page, and try again.",
      { error: true },
    );
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.innerHTML =
      'Analyze with EconBERT <span aria-hidden="true">↗</span>';
  }
});

textArea.value = examples.growth.text;
renderResult(examples.growth);
setActiveTab("growth");

const yearNode = document.querySelector("#current-year");
if (yearNode) yearNode.textContent = new Date().getFullYear();
