# Run the bot in a container (handy for putting it on a VPS in a permitted region).
# Build:  docker build -f deploy/Dockerfile -t bybit-options-bot .
# Run:    docker run --rm --env-file .env -v "$PWD/logs:/app/logs" \
#                -v "$PWD/state:/app/state" bybit-options-bot
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot ./bot
COPY run.py config.yaml ./

# Defaults to the safe scan/alert loop; override CMD for live, e.g.:
#   docker run ... bybit-options-bot python run.py
CMD ["python", "run.py"]
