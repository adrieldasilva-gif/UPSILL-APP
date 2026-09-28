// Função do Netlify: recebe o pedido do CUTO Assist, confere o código da clínica
// e repassa à API da Anthropic usando a chave guardada como variável secreta.
// Variáveis no Netlify: ANTHROPIC_API_KEY (obrigatória), CUTO_ACCESS_CODE (obrigatória), CUTO_MODEL (opcional).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { type: 'method_not_allowed', message: 'Use POST.' } }) };
  }

  const codigo = event.headers['x-cuto-code'] || event.headers['X-Cuto-Code'] || '';
  if (!process.env.CUTO_ACCESS_CODE || codigo !== process.env.CUTO_ACCESS_CODE) {
    return { statusCode: 401, body: JSON.stringify({ error: { type: 'invalid_code', message: 'Código da clínica inválido.' } }) };
  }

  let pedido;
  try {
    pedido = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { type: 'bad_request', message: 'Pedido inválido.' } }) };
  }

  const payload = {
    model: process.env.CUTO_MODEL || 'claude-sonnet-4-6',
    max_tokens: Math.min(Number(pedido.max_tokens) || 2000, 4000),
    system: pedido.system,
    messages: pedido.messages
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });

  const texto = await resp.text();
  return { statusCode: resp.status, headers: { 'Content-Type': 'application/json' }, body: texto };
};
