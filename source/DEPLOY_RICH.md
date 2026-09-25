# RICH deployment

Vercel project: `rich-nowgo`
Git repository: `kjwcoin/kjwcoin-hot-nowgo`
Production branch: `rich`
Root Directory: `source`
Framework: Next.js

Required environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- KAKAO_MAP_JAVASCRIPT_KEY

Optional integrations:
- KAKAO_MAP_REST_KEY
- NOWGO_STATUS_API_URL
- NOWGO_STATUS_API_TOKEN
- KAKAO_CHAT_URL

Custom domain:
- rich.nowgo.space

Deployment rule:
- RICH project deploys branch `rich` only.
- HOT and SWEET projects must ignore branch `rich`.
