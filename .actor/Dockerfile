# Apify Actor Dockerfile for Recrea Construction Lead Scraper
FROM apify/actor-node-playwright-chrome:20

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "NPM install succeeded"

# Copy source files
COPY . ./

# Run the actor
CMD npm start
