let classifierPromise;

function sendStatus(id, title, detail, progress) {
  self.postMessage({ id, type: "status", title, detail, progress });
}

async function getClassifier(id) {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      sendStatus(
        id,
        "Preparing EconBERT",
        "Loading the secure browser inference runtime.",
      );

      const { env, pipeline } = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1"
      );

      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      env.localModelPath = new URL("models/", self.location.href).href;
      env.useBrowserCache = true;

      return pipeline("text-classification", "econbert", {
        dtype: "q8",
        progress_callback: (event) => {
          if (event.status !== "progress") return;
          const progress = Number(event.progress);
          sendStatus(
            id,
            "Downloading EconBERT",
            Number.isFinite(progress)
              ? `Model download ${Math.round(progress)}% complete. It will be cached for future visits.`
              : "Downloading the model. It will be cached for future visits.",
            Number.isFinite(progress) ? progress : undefined,
          );
        },
      });
    })().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  } else {
    sendStatus(
      id,
      "Running EconBERT",
      "Analyzing the economic direction of this passage.",
    );
  }

  return classifierPromise;
}

self.addEventListener("message", async ({ data }) => {
  if (!data || data.type !== "analyze") return;

  const { id, text } = data;
  try {
    const classifier = await getClassifier(id);
    sendStatus(
      id,
      "Running EconBERT",
      "Analyzing the economic direction of this passage.",
    );
    const output = await classifier(text, {
      top_k: null,
      truncation: true,
      max_length: 512,
    });

    const byLabel = Object.fromEntries(
      output.map(({ label, score }) => [label.toLowerCase(), Number(score)]),
    );
    const probabilities = [
      byLabel.negative,
      byLabel.neutral,
      byLabel.positive,
    ];
    if (probabilities.some((value) => !Number.isFinite(value))) {
      throw new Error("The model returned incomplete labels.");
    }

    self.postMessage({
      id,
      type: "result",
      result: {
        score: probabilities[2] - probabilities[0],
        probabilities,
      },
    });
  } catch (error) {
    console.error("EconBERT worker error", error);
    self.postMessage({
      id,
      type: "error",
      message: "The browser could not load or run the EconBERT model.",
    });
  }
});
