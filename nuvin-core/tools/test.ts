import { WebFetchTool } from './WebFetchTool';

async function main() {
  const url = process.argv[2] ?? 'https://www.accuweather.com/en/vn/da-nang/352954/weather-forecast/352954';
  const tool = new WebFetchTool();
  const out = await tool.execute({ url });
  // pretty print & truncate big payloads
  const asStr = typeof out.result === 'string' ? out.result : JSON.stringify(out.result, null, 2);
  const preview = asStr.length > 4000 ? asStr.slice(0, 4000) + '\n...[truncated]' : asStr;
  console.log(JSON.stringify({ ...out, result: preview }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
