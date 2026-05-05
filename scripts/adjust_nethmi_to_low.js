const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');
const { ObjectId } = mongoose.Types;

function loadEnvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), 'frontend/.env'));
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' });
  const db = mongoose.connection.db;

  const latest = await db
    .collection('predictions')
    .find({ studentIdNumber: 'it25110011' })
    .sort({ apiTimestamp: -1 })
    .limit(1)
    .next();

  if (!latest) {
    throw new Error('No prediction found for Nethmi Perera');
  }

  const result = await db.collection('predictions').updateOne(
    { _id: new ObjectId(latest._id) },
    {
      $set: {
        'inputData.avg_score': 76,
        'inputData.completion_rate': 0.78,
        'prediction.at_risk': false,
        'prediction.confidence': 0.742,
        'prediction.risk_level': 'low',
        'prediction.risk_probability': 0.284,
        'prediction.risk_factors': [
          'Steady engagement across active subjects',
          'Recent completion trend is improving',
        ],
        'recommendations.explanation':
          'Recent progress indicates low academic risk with improving completion and more stable performance.',
        'recommendations.motivation':
          'Keep the current rhythm going and maintain timely completion across active subjects.',
        'recommendations.action_steps': [
          'Keep using a weekly task checklist.',
          'Finish the next active task one day early.',
          'Maintain two focused study sessions per week.',
        ],
        'recommendations.source': 'manual_demo_adjustment',
      },
    }
  );

  const updated = await db.collection('predictions').findOne(
    { _id: new ObjectId(latest._id) },
    {
      projection: {
        studentIdNumber: 1,
        apiTimestamp: 1,
        'prediction.risk_level': 1,
        'prediction.risk_probability': 1,
        'inputData.avg_score': 1,
        'inputData.completion_rate': 1,
      },
    }
  );

  console.log(
    JSON.stringify(
      {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        updated,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
