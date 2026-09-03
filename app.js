const examples = {
  growth: {
    text: "Payroll employment continued to increase and the unemployment rate remained low, while inflation pressures eased further.",
    score: 0.62,
    probabilities: [0.12, 0.14, 0.74],
  },
  mixed: {
    text: "Consumer spending remained resilient, although tighter credit conditions weighed on housing activity and business investment.",
    score: -0.05,
    probabilities: [0.28, 0.49, 0.23],
  },
  downturn: {
    text: "Manufacturing activity contracted sharply as new orders declined and firms reported broad-based weakness in demand.",
    score: -0.71,
    probabilities: [0.78, 0.15, 0.07],
  },
};

const textArea = document.querySelector("#economic-text");
const analyzeButton = document.querySelector("#analyze-button");
const resultPanel = document.querySelector("#result-panel");
const notice = document.querySelector("#demo-notice");
const tabs = [...document.querySelectorAll("[data-example]")];

function setActiveTab(key) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.example === key;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
}

function renderResult(result) {
  const [negative, neutral, positive] = result.probabilities;
  const classification =
    result.score > 0.15
      ? "Positive"
      : result.score < -0.15
        ? "Negative"
        : "Neutral";
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
  if (!text) return;
  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing…";

  const match = Object.values(examples).find(
    (example) => example.text.trim() === text,
  );
  if (match) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    renderResult(match);
  } else if (window.ECONBERT_API_URL) {
    try {
      const response = await fetch(window.ECONBERT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Inference request failed");
      renderResult(await response.json());
    } catch {
      resultPanel.hidden = true;
      notice.hidden = false;
    }
  } else {
    resultPanel.hidden = true;
    notice.hidden = false;
  }

  analyzeButton.disabled = false;
  analyzeButton.innerHTML =
    'Analyze passage <span aria-hidden="true">↗</span>';
});

textArea.value = examples.growth.text;
renderResult(examples.growth);
setActiveTab("growth");

const yearNode = document.querySelector("#current-year");
if (yearNode) yearNode.textContent = new Date().getFullYear();
