const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = {
    nestpay_client_id: !!Deno.env.get("NESTPAY_CLIENT_ID"),
    nestpay_store_key: !!Deno.env.get("NESTPAY_STORE_KEY"),
    iyzico_api_key: !!Deno.env.get("IYZICO_API_KEY"),
    iyzico_secret_key: !!Deno.env.get("IYZICO_SECRET_KEY"),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
