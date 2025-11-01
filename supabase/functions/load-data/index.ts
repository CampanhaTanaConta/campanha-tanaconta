import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.203.0/csv/mod.ts';
import { format, parse as parseDate } from 'https://deno.land/std@0.203.0/datetime/mod.ts';
import CryptoJS from 'https://esm.sh/crypto-js@4.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoadDataRequest {
  participantsUrl?: string;
  walletUrl?: string;
  transactionsUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { participantsUrl, walletUrl, transactionsUrl }: LoadDataRequest = await req.json();

    const results = {
      participants: 0,
      wallet: 0,
      transactions: 0,
      errors: [] as string[],
    };

    // Load participants data
    if (participantsUrl) {
      try {
        const response = await fetch(participantsUrl);
        const csvText = await response.text();
        const records = parse(csvText, { skipFirstRow: true });

        for (const record of records) {
          const email = String(record[4] || '').trim().toLowerCase();
          const participante = String(record[2] || '').trim();
          const nascimento = String(record[5] || '').trim();

          if (!email || !participante || !nascimento) continue;

          // Parse date (dd/mm/yyyy format)
          const [day, month, year] = nascimento.split('/');
          if (!day || !month || !year) continue;

          const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const passwordPlain = `${day.padStart(2, '0')}${month.padStart(2, '0')}${year}`;
          const birthHash = CryptoJS.SHA256(passwordPlain).toString();

          const { error } = await supabaseClient
            .from('participants')
            .upsert(
              {
                email,
                participante,
                birth_raw: birthDate,
                birth_hash: birthHash,
              },
              { onConflict: 'email' }
            );

          if (!error) results.participants++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Participants: ${errorMessage}`);
      }
    }

    // Load wallet data
    if (walletUrl) {
      try {
        const response = await fetch(walletUrl);
        const csvText = await response.text();
        const records = parse(csvText, { skipFirstRow: true });

        // Clear existing wallet data
        await supabaseClient.from('wallet').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        for (const record of records) {
          const clienteNome = String(record[0] || '').trim();
          const clienteId = String(record[1] || '').trim();
          const participante = String(record[3] || '').trim();

          if (!clienteNome || !clienteId || !participante) continue;

          const { error } = await supabaseClient.from('wallet').insert({
            participante,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
          });

          if (!error) results.wallet++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Wallet: ${errorMessage}`);
      }
    }

    // Load transactions data
    if (transactionsUrl) {
      try {
        const response = await fetch(transactionsUrl);
        const csvText = await response.text();
        const records = parse(csvText, { skipFirstRow: true });

        // Clear existing transactions
        await supabaseClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        for (const record of records) {
          const clienteId = String(record[4] || '').trim();
          const dataTransacao = String(record[6] || '').trim();
          const tipoVenda = String(record[14] || '').trim();
          const totalParcela = String(record[13] || '0').replace(',', '.');
          const premiacaoPct = String(record[15] || '0').replace('%', '').replace(',', '.');

          if (!clienteId || !dataTransacao || !tipoVenda) continue;

          // Parse date (dd/mm/yyyy format)
          const [day, month, year] = dataTransacao.split('/');
          if (!day || !month || !year) continue;

          const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          // Normalize percentage (handle 10, 10%, 0.10, 0,10)
          let premiacaoPctNorm = parseFloat(premiacaoPct);
          if (premiacaoPctNorm > 1) {
            premiacaoPctNorm = premiacaoPctNorm / 100;
          }

          const totalParcelaNum = parseFloat(totalParcela);
          const premiacaoValor = totalParcelaNum * premiacaoPctNorm;

          const { error } = await supabaseClient.from('transactions').insert({
            cliente_id: clienteId,
            data_transacao: date,
            tipo_venda: tipoVenda,
            total_parcela: totalParcelaNum,
            premiacao_pct_norm: premiacaoPctNorm,
            premiacao_valor: premiacaoValor,
          });

          if (!error) results.transactions++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Transactions: ${errorMessage}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});