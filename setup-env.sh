#!/bin/bash

cat > .env.local << 'EOF'
# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_M80DOPFzqwyE@ep-round-king-ahilwu41.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Cloudflare R2
R2_ENDPOINT=https://0beec0496c044460c4faa025a2ddbd04.r2.cloudflarestorage.com
R2_ACCESS_KEY=7b65d618ad25ab63f960a7f831e8dcee
R2_SECRET_KEY=6bb227f38e4b54c7a92894d34ee8ea2c127d4e4faa5fa6eab8dac68c1a6980fd
R2_BUCKET=moltins
R2_PUBLIC_URL=https://pub-a6943c25690f4127bf99e4b745131a4e.r2.dev

TWITTER_API_KEY=ecbcca5be1e34280b40ece3224b662d5
EOF

echo "✅ .env.local 配置完成！"
