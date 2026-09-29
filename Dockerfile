FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends iverilog \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/project.v src/project.v
COPY demo/server.js demo/server.js
COPY demo/web demo/web
COPY evidence/layout/gds_render.png evidence/layout/gds_render.png

ENV HOST=0.0.0.0
EXPOSE 10000
CMD ["node", "demo/server.js"]
