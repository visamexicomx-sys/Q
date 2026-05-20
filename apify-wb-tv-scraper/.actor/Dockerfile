FROM apify/actor-node:20

COPY --chown=myuser package*.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional \
 && echo "Installed npm packages:" \
 && (npm list --omit=dev --all || true)

COPY --chown=myuser . ./

CMD npm start --silent
