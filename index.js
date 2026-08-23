export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. ENDPOINT PARA ACORTAR EL LINK (POST)
    if (request.method === "POST" && path === "/api/shorten") {
      try {
        const body = await request.json();
        let targetUrl = body.originalUrl;

        if (!targetUrl) {
          return new Response(JSON.stringify({ error: "Falta la URL" }), { status: 400 });
        }

        // Asegurar que tenga protocolo
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
          targetUrl = "https://" + targetUrl;
        }

        // Generar número de 5 cifras
        const randomId = Math.floor(10000 + Math.random() * 90000);
        const username = `user${randomId}`;

        // Guardar en el KV de Cloudflare (Clave: username, Valor: URL original)
        await env.ENLACES_KV.put(username, targetUrl);

        // Retornar el link corto y limpio
        const shortUrl = `${url.origin}/@${username}`;
        return new Response(JSON.stringify({ shortUrl }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Error en el servidor" }), { status: 500 });
      }
    }

    // 2. REDIRECCIÓN CUANDO ENTRAN AL LINK CORTO (GET /@user12345)
    if (request.method === "GET" && path.startsWith("/@")) {
      const username = path.substring(1); // Saca la barra y el @, queda "user12345"
      const targetUrl = await env.ENLACES_KV.get(username);

      if (targetUrl) {
        // Redirige de una al link original
        return Response.redirect(targetUrl, 302);
      } else {
        return new Response("Enlace no encontrado o expirado.", { status: 404 });
      }
    }

    // 3. INTERFAZ WEB (HTML para la página principal)
    return new Response(getHtml(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};

// Interfaz prolija para acortar
function getHtml() {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acortador Oficial</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .card { background: #1a1a1a; padding: 30px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); text-align: center; border: 1px solid #333; }
      h2 { margin-bottom: 20px; color: #fe2c55; }
      input { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #444; background: #111; color: #fff; box-sizing: border-box; font-size: 14px; }
      button { width: 100%; padding: 12px; background: #fe2c55; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; transition: background 0.2s; }
      button:hover { background: #e0244b; }
      .result { margin-top: 20px; word-break: break-all; background: #111; padding: 10px; border-radius: 6px; border: 1px solid #333; font-family: monospace; display: none; color: #25f4ee; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Acortador TikTok</h2>
      <input type="text" id="urlInput" placeholder="Pegá tu link (ej: discord.gg/...)">
      <button onclick="generar()">Generar Link Corto</button>
      <div class="result" id="resultBox"></div>
    </div>

    <script>
      async function generar() {
        const originalUrl = document.getElementById('urlInput').value;
        if (!originalUrl) return alert('¡Poné un link, pedazo de cabeza de termo!');

        const res = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalUrl })
        });

        const data = await res.json();
        const box = document.getElementById('resultBox');
        if (data.shortUrl) {
          box.style.display = 'block';
          box.innerHTML = 'Link listo: <br><a href="' + data.shortUrl + '" target="_blank" style="color: #25f4ee;">' + data.shortUrl + '</a>';
        } else {
          alert('Hubo un error');
        }
      }
    </script>
  </body>
  </html>
  `;
}
