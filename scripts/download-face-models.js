/**
 * Script to download face-api.js model files
 * Run with: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/';
const MODELS_DIR = path.join(__dirname, '../public/models/face-api');

// Models to download (using tiny_face_detector for speed, ssd_mobilenetv1 for accuracy)
const MODELS = [
  // Tiny face detector (fast, less accurate - for client-side)
  { name: 'tiny_face_detector_model-weights_manifest.json', dir: 'tiny_face_detector' },
  { name: 'tiny_face_detector_model-shard1', dir: 'tiny_face_detector' },
  
  // SSD Mobilenet V1 (more accurate - for server-side)
  { name: 'ssd_mobilenetv1_model-weights_manifest.json', dir: 'ssd_mobilenetv1' },
  { name: 'ssd_mobilenetv1_model-shard1', dir: 'ssd_mobilenetv1' },
  { name: 'ssd_mobilenetv1_model-shard2', dir: 'ssd_mobilenetv1' },
  
  // Face landmark detection (for head pose)
  { name: 'face_landmark_68_model-weights_manifest.json', dir: 'face_landmark_68' },
  { name: 'face_landmark_68_model-shard1', dir: 'face_landmark_68' },
  
  // Face recognition (for face matching)
  { name: 'face_recognition_model-weights_manifest.json', dir: 'face_recognition' },
  { name: 'face_recognition_model-shard1', dir: 'face_recognition' },
  { name: 'face_recognition_model-shard2', dir: 'face_recognition' },
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  // Create models directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('Downloading face-api.js models...');
  console.log('This may take a few minutes...\n');

  for (const model of MODELS) {
    const modelDir = path.join(MODELS_DIR, model.dir);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    const url = `${MODEL_BASE_URL}${model.dir}/${model.name}`;
    const filepath = path.join(modelDir, model.name);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${model.name} already exists, skipping...`);
      continue;
    }

    try {
      console.log(`Downloading ${model.name}...`);
      await downloadFile(url, filepath);
      console.log(`✓ Downloaded ${model.name}`);
    } catch (error) {
      console.error(`✗ Failed to download ${model.name}:`, error.message);
    }
  }

  console.log('\n✓ Model download complete!');
  console.log(`Models saved to: ${MODELS_DIR}`);
}

downloadModels().catch(console.error);

