# Kaiwen Qiu — Research Portfolio

Static personal website for Kaiwen Qiu, an Economics Ph.D. candidate at Rutgers University working on real-time forecasting, machine learning, economic narratives, and systematic macro research.

## Publishing

GitHub Actions publishes the repository to GitHub Pages after each push to `main`.

In the repository settings, open **Pages** and select **GitHub Actions** as the source if it is not selected automatically.

## EconBERT demo

The included interface uses precomputed research examples until a model endpoint is configured. After deploying the private inference service, set its public HTTPS URL in `config.js`. The endpoint should accept:

```json
{"text": "Economic activity continued to expand..."}
```

and return:

```json
{"score": 0.42, "probabilities": [0.12, 0.34, 0.54]}
```
