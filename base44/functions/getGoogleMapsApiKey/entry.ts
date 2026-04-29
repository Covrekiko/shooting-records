Deno.serve(async (req) => {
  const apiKey = Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }
  return Response.json({ apiKey });
});