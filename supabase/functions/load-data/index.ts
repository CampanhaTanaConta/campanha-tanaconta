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
  departmentStoreUrl?: string;
  participantsContent?: string;
  walletContent?: string;
  transactionsContent?: string;
  departmentStoreContent?: string;
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

    const { 
      participantsUrl, 
      walletUrl, 
      transactionsUrl, 
      departmentStoreUrl,
      participantsContent,
      walletContent,
      transactionsContent,
      departmentStoreContent
    }: LoadDataRequest = await req.json();

    const results = {
      participants: 0,
      wallet: 0,
      transactions: 0,
      departmentStore: 0,
      errors: [] as string[],
    };

    // Load participants data
    if (participantsContent || participantsUrl) {
      try {
        let csvText: string;
        if (participantsContent) {
          csvText = participantsContent;
        } else {
          const response = await fetch(participantsUrl!);
          csvText = await response.text();
        }
        const records = parse(csvText, { skipFirstRow: false });

        // Skip header row manually (start from index 1)
        for (let i = 1; i < records.length; i++) {
          const record = records[i];
          const email = String(record[4] || '').trim().toLowerCase();
          const participante = String(record[2] || '').trim();
          const nascimento = String(record[5] || '').trim();

          if (!email || !participante || !nascimento) continue;

          // Parse date (dd/mm/yyyy format)
          const [day, month, year] = nascimento.split('/');
          if (!day || !month || !year) continue;

          const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          // Use original format with slashes (DD/MM/AAAA) for hash generation
          const passwordPlain = nascimento;
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
    if (walletContent || walletUrl) {
      try {
        let csvText: string;
        if (walletContent) {
          csvText = walletContent;
        } else {
          const response = await fetch(walletUrl!);
          csvText = await response.text();
        }
        const records = parse(csvText, { skipFirstRow: false });

        // Clear existing wallet data
        await supabaseClient.from('wallet').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Skip header row manually (start from index 1)
        for (let i = 1; i < records.length; i++) {
          const record = records[i];
          const clienteNome = String(record[0] || '').trim();
          const clienteId = String(record[1] || '').trim();
          const distribuidor = String(record[2] || '').trim(); // Column C: Distribuidor
          const participante = String(record[3] || '').trim();

          if (!clienteNome || !clienteId || !participante) continue;

          const { error } = await supabaseClient.from('wallet').insert({
            participante,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            distribuidor,
          });

          if (!error) results.wallet++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Wallet: ${errorMessage}`);
      }
    }

    // Load transactions data
    if (transactionsContent || transactionsUrl) {
      try {
        let csvText: string;
        if (transactionsContent) {
          csvText = transactionsContent;
        } else {
          const response = await fetch(transactionsUrl!);
          csvText = await response.text();
        }
        const records = parse(csvText, { skipFirstRow: false });

        // Clear existing transactions
        await supabaseClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Skip header row manually (start from index 1)
        for (let i = 1; i < records.length; i++) {
          const record = records[i];
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

    // Load department store data
    if (departmentStoreContent || departmentStoreUrl) {
      try {
        let csvText: string;
        if (departmentStoreContent) {
          console.log('[Department Store] Using content, length:', departmentStoreContent.length);
          csvText = departmentStoreContent;
        } else {
          console.log('[Department Store] Fetching from URL:', departmentStoreUrl);
          const response = await fetch(departmentStoreUrl!);
          csvText = await response.text();
        }
        const records = parse(csvText, { skipFirstRow: false });
        console.log('[Department Store] Parsed records:', records.length);
        
        // Log header for debugging
        if (records.length > 0) {
          console.log('[Department Store] Header row:', records[0]);
          console.log('[Department Store] Total columns:', records[0].length);
        }
        
        // Log first data row for debugging
        if (records.length > 1) {
          console.log('[Department Store] First data row:', records[1]);
        }

        // Clear existing department store data
        await supabaseClient.from('department_store').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        let processedCount = 0;
        let skippedCount = 0;
        // Skip header row manually (start from index 1)
        for (let i = 1; i < records.length; i++) {
          const record = records[i];
          const clienteId = String(record[0] || '').trim(); // ID
          const idExterno = String(record[1] || '').trim();
          const tipoPessoa = String(record[2] || '').trim();
          const cpf = String(record[3] || '').trim();
          const nome = String(record[4] || '').trim();
          const tipo = String(record[5] || '').trim();
          const marketplace = String(record[6] || '').trim();
          const representante = String(record[7] || '').trim();
          const plano = String(record[8] || '').trim();
          const cidade = String(record[14] || '').trim();
          const uf = String(record[15] || '').trim();
          const cnpj = String(record[16] || '').trim();
          const razaoSocial = String(record[17] || '').trim();
          const email = String(record[18] || '').trim();
          const telefone = String(record[19] || '').trim();
          const etapa = String(record[20] || '').trim();
          const dataCadastroStr = String(record[21] || '').trim();
          const status = String(record[22] || '').trim();

          if (!clienteId || !nome) {
            skippedCount++;
            console.log('[Department Store] Skipping record - missing clienteId or nome:', { clienteId, nome });
            continue;
          }

          // Parse date if available (yyyy-mm-dd hh:mm:ss format)
          let dataCadastro = null;
          if (dataCadastroStr) {
            const dateMatch = dataCadastroStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              dataCadastro = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
            }
          }

          const { error } = await supabaseClient.from('department_store').insert({
            cliente_id: clienteId,
            id_externo: idExterno || null,
            tipo_pessoa: tipoPessoa || null,
            cpf: cpf || null,
            nome,
            tipo: tipo || null,
            marketplace: marketplace || null,
            representante: representante || null,
            plano: plano || null,
            cidade: cidade || null,
            uf: uf || null,
            cnpj: cnpj || null,
            razao_social: razaoSocial || null,
            email: email || null,
            telefone: telefone || null,
            etapa: etapa || null,
            data_cadastro: dataCadastro,
            status: status || null,
          });

          if (!error) {
            results.departmentStore++;
            processedCount++;
          } else {
            console.error('[Department Store] Insert error:', error);
            results.errors.push(`Department Store linha ${processedCount + skippedCount + 1}: ${error.message}`);
          }
        }
        console.log('[Department Store] Processed:', processedCount, 'Skipped:', skippedCount);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Department Store] Error:', errorMessage);
        results.errors.push(`Department Store: ${errorMessage}`);
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