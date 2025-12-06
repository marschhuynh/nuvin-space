import { AnthropicAISDKLLM } from './packages/nuvin-core/dist/index.js';

async function testGetModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('⚠️  ANTHROPIC_API_KEY not set. Skipping test.');
    console.log('To test: export ANTHROPIC_API_KEY=your-key-here');
    return;
  }

  console.log('🔍 Testing Anthropic getModels...\n');

  const llm = new AnthropicAISDKLLM({ apiKey });

  try {
    const models = await llm.getModels();
    console.log(`✅ Successfully fetched ${models.length} models:\n`);

    for (const model of models) {
      console.log(`  • ${model.id}`);
      console.log(`    Name: ${model.name}`);
      if (model.limits) {
        console.log(`    Context Window: ${model.limits.contextWindow.toLocaleString()} tokens`);
        if (model.limits.maxOutput) {
          console.log(`    Max Output: ${model.limits.maxOutput.toLocaleString()} tokens`);
        }
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
    process.exit(1);
  }
}

testGetModels();
