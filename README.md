<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c4fba05b-e315-4a6a-889d-f791a13e2841

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Start the local server that keeps data on disk:
   `npm run server`
3. In a second terminal, run the app:
   `npm run dev`
4. Open the app in the browser and keep the backup data directory on an external drive if needed by setting `DATA_DIR`.

Example:
`DATA_DIR=E:/fincontrol-backup npm run server`

This keeps the app data on disk instead of only in browser storage, so your existing finance records can be preserved and backed up to an external drive.
