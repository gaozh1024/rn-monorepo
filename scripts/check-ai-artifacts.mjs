import { generateArtifacts } from './generate-ai-artifacts.mjs';

const mismatches = await generateArtifacts({ check: true });

if (mismatches.length > 0) {
  console.error('AI artifacts are out of date:');
  for (const mismatch of mismatches) console.error(`- ${mismatch}`);
  console.error('Run `pnpm ai:generate` and review the generated changes.');
  process.exit(1);
}

console.log('AI artifacts are up to date.');
