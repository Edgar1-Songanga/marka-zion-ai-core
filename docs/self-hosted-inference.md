# Self-hosted AI inference

AI Core supports an OpenAI-compatible inference endpoint. The first local runtime is Ollama; the same adapter can later target llama.cpp server or vLLM without changing MARKA/ZION orchestration.

## Local development

Requirements: Docker Engine with the Compose plugin. Model performance depends on available RAM/VRAM and CPU/GPU.

1. Start the local inference runtime:

   `docker compose -f docker-compose.local-ai.yml up -d`

2. Download a model (choose according to available memory):

   `docker exec -it marka-zion-local-inference ollama pull qwen2.5:3b`

   For better answer quality, test `qwen2.5:7b` on a machine with sufficient memory. Model weights are downloaded once and stored in the Docker volume.

3. Configure AI Core locally:

   ```env
   AI_PROVIDER=openai-compatible
   AI_INFERENCE_BASE_URL=http://127.0.0.1:11434/v1
   AI_INFERENCE_API_KEY=
   AI_MODEL=qwen2.5:3b
   ```

4. Start AI Core and test a real generation. The endpoint is not considered operational until a successful authenticated AI Core request is verified.

The Compose port is bound to loopback, not exposed to the public internet.

## Production deployment

Do not point a Vercel Function at `127.0.0.1`: that address would refer to the Vercel runtime, not the machine running Ollama.

Production requires an always-on server or controlled compute host running Ollama, llama.cpp server, or vLLM, reachable by AI Core through HTTPS. Configure:

- `AI_PROVIDER=openai-compatible`
- `AI_INFERENCE_BASE_URL=https://<private-inference-host>/v1`
- `AI_INFERENCE_API_KEY=<strong-random-secret>`
- `AI_MODEL=<model-id-loaded-by-the-runtime>`

The production startup validator requires HTTPS and an inference API key. Keep the inference service behind a firewall or private network where possible, rate-limit it, and never expose Ollama's unauthenticated port directly to the internet. Store the key only in the deployment's encrypted environment variables.

## Cost and ownership

Ollama, llama.cpp and vLLM are open-source runtimes. Open-weight model licensing varies by model and must be checked before commercial redistribution or hosting. Self-hosting removes per-token API billing, but it does not remove hardware, electricity, bandwidth, storage, maintenance or hosting costs. A genuinely zero-new-cash pilot can use hardware already owned; a reliable always-on production service needs an available machine and operating budget.

## Current integration boundary

The provider adapter, production configuration validation and environment template are implemented. Existing production remains on its current provider until an inference host, model and protected HTTPS endpoint are provisioned and tested. No paid API key or payment method is required for the self-hosted path.
