export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = String(body.message || "").trim();

        if (!message) {
          return Response.json({ error: "Pesan kosong." }, { status: 400 });
        }

        if (!env.TOKENHARBOR_API_KEY) {
          return Response.json({ error: "TOKENHARBOR_API_KEY belum dipasang." }, { status: 500 });
        }

        const upstream = await fetch("https://tokenharbor.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + env.TOKENHARBOR_API_KEY
          },
          body: JSON.stringify({
            model: "deepseek-v4.1-flash:free",
            messages: [
              {
                role: "system",
                content: "Kamu adalah Nozomi, asisten AI yang ramah, santai, membantu, dan menjawab dalam bahasa Indonesia kecuali pengguna meminta bahasa lain."
              },
              { role: "user", content: message }
            ]
          })
        });

        const data = await upstream.json();

        if (!upstream.ok) {
          return Response.json(
            { error: data?.error?.message || data?.message || "TokenHarbor mengembalikan error." },
            { status: upstream.status }
          );
        }

        return Response.json({
          reply: data?.choices?.[0]?.message?.content || "Tidak ada jawaban dari model."
        });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 });
      }
    }

    if (url.pathname === "/") {
      return new Response(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nozomi AI</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0d0f14;color:#fff;font-family:system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}header{padding:16px 18px;font-size:21px;font-weight:800;border-bottom:1px solid #252a33;background:#11141b}#chat{flex:1;overflow:auto;padding:16px}.msg{max-width:86%;padding:12px 14px;margin:10px 0;border-radius:16px;white-space:pre-wrap;line-height:1.45}.ai{background:#1b2029}.user{background:#2563eb;margin-left:auto}form{display:flex;gap:8px;padding:12px;background:#11141b;border-top:1px solid #252a33}input{flex:1;border:1px solid #343a46;border-radius:14px;background:#181c24;color:#fff;padding:14px;font-size:16px;outline:none}button{border:0;border-radius:14px;padding:0 18px;font-weight:800}
</style>
</head>
<body>
<header>Nozomi AI</header>
<div id="chat"><div class="msg ai">Selamat datang master 😁</div></div>
<form id="form"><input id="input" placeholder="Tulis pesan..." autocomplete="off"><button>Kirim</button></form>
<script>
const form=document.getElementById('form');
const input=document.getElementById('input');
const chat=document.getElementById('chat');
function add(text,cls){const d=document.createElement('div');d.className='msg '+cls;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d;}
form.addEventListener('submit',async(e)=>{e.preventDefault();const message=input.value.trim();if(!message)return;add(message,'user');input.value='';const ai=add('Nozomi sedang berpikir...','ai');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});const data=await r.json();ai.textContent=r.ok?data.reply:(data.error||'Terjadi error.');}catch(err){ai.textContent='Gagal terhubung ke server.';}});
</script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};
