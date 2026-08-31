export async function fetchVercelSupportedModels() {
  try {
    const { data: models } = await fetch("https://ai-gateway.vercel.sh/v1/models")
      .then(res => res.json());

    // filter language model https://vercel.com/docs/ai-gateway/models-and-providers#filtering-models-by-type
    const textModels = models.filter((m: any) => m.type === "language");
    Bun.write("response2.json", JSON.stringify(textModels, null, 2));
  }
  catch (err) {
    console.error(err);
    return [];
  }
}
await fetchVercelSupportedModels();
