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

// Utility: Normalize CNPJ to 14 digits (remove non-digits, left-pad with zeros)
function normalizeCnpj(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(14, '0');
}

// Utility: Find column index by header name (case-insensitive, accent-insensitive)
function getIndex(headers: string[], candidates: string[]): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

  const normalizedHeaders = headers.map(normalize);
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const idx = normalizedHeaders.indexOf(normalizedCandidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Utility: Parse Brazilian number format (1.234,56 -> 1234.56)
function parseBrazilianNumber(value: string): number {
  if (!value) return 0;
  // Remove dots (thousands separator) and replace comma with dot
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
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
      stats: {
        walletIds: 0,
        txIds: 0,
        intersection: 0,
      }
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
        console.log('[Wallet] Total records:', records.length);

        if (records.length === 0) {
          results.errors.push('Wallet: CSV vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[Wallet] Headers:', headers);

          const idxClienteNome = getIndex(headers, ['Cliente', 'Razão Social', 'Nome']);
          const idxClienteId = getIndex(headers, ['CNPJ', 'CPF/CNPJ', 'Documento']);
          const idxDistribuidor = getIndex(headers, ['Distribuidor']);
          const idxParticipante = getIndex(headers, ['Participante', 'Vendedor', 'Consultor']);

          console.log('[Wallet] Column indices:', { idxClienteNome, idxClienteId, idxDistribuidor, idxParticipante });

          // Clear existing wallet data
          await supabaseClient.from('wallet').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          // Process data rows (skip header)
          for (let i = 1; i < records.length; i++) {
            const record = records[i];
            const clienteNome = idxClienteNome >= 0 ? String(record[idxClienteNome] || '').trim() : '';
            const clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
            const distribuidor = idxDistribuidor >= 0 ? String(record[idxDistribuidor] || '').trim() : '';
            const participante = idxParticipante >= 0 ? String(record[idxParticipante] || '').trim() : '';

            const clienteId = normalizeCnpj(clienteIdRaw);

            if (!clienteId || !participante) {
              console.log('[Wallet] Skipping row', i, '- missing CNPJ or participante');
              continue;
            }

            const { error } = await supabaseClient.from('wallet').insert({
              participante,
              cliente_id: clienteId,
              cliente_nome: clienteNome,
              distribuidor: distribuidor || null,
            });

            if (!error) results.wallet++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Wallet: ${errorMessage}`);
        console.error('[Wallet] Error:', errorMessage);
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
        console.log('[Transactions] Total records:', records.length);

        if (records.length === 0) {
          results.errors.push('Transactions: CSV vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[Transactions] Headers:', headers);

          const idxClienteId = getIndex(headers, ['CNPJ', 'CPF/CNPJ', 'Documento']);
          const idxDataTransacao = getIndex(headers, ['Data', 'Data Transação', 'Data Transacao', 'Emissão', 'Emissao']);
          const idxTipoVenda = getIndex(headers, ['Tipo Venda', 'Categoria', 'Produto']);
          const idxTotalParcela = getIndex(headers, ['Total Parcela', 'Valor', 'Total']);
          const idxPremiacaoPct = getIndex(headers, ['Premiação %', 'Premiacao %', 'Premiação', 'Premiacao', 'Comissão %', 'Comissao %']);

          console.log('[Transactions] Column indices:', { idxClienteId, idxDataTransacao, idxTipoVenda, idxTotalParcela, idxPremiacaoPct });

          // Clear existing transactions
          await supabaseClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          // Process data rows (skip header)
          for (let i = 1; i < records.length; i++) {
            const record = records[i];
            const clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
            const dataTransacao = idxDataTransacao >= 0 ? String(record[idxDataTransacao] || '').trim() : '';
            const tipoVenda = idxTipoVenda >= 0 ? String(record[idxTipoVenda] || '').trim() : '';
            const totalParcelaStr = idxTotalParcela >= 0 ? String(record[idxTotalParcela] || '0').trim() : '0';
            const premiacaoPctStr = idxPremiacaoPct >= 0 ? String(record[idxPremiacaoPct] || '0').trim() : '0';

            const clienteId = normalizeCnpj(clienteIdRaw);

            if (!clienteId || !dataTransacao || !tipoVenda) {
              console.log('[Transactions] Skipping row', i, '- missing CNPJ, date, or tipo');
              continue;
            }

            // Parse date (dd/mm/yyyy format)
            const [day, month, year] = dataTransacao.split('/');
            if (!day || !month || !year) {
              console.log('[Transactions] Skipping row', i, '- invalid date format:', dataTransacao);
              continue;
            }

            const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // Parse total parcela
            const totalParcelaNum = parseBrazilianNumber(totalParcelaStr);

            // Normalize percentage (handle 10, 10%, 0.10, 0,10)
            const premiacaoPctCleaned = premiacaoPctStr.replace('%', '').replace(',', '.');
            let premiacaoPctNorm = parseFloat(premiacaoPctCleaned) || 0;
            if (premiacaoPctNorm > 1) {
              premiacaoPctNorm = premiacaoPctNorm / 100;
            }

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
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Transactions: ${errorMessage}`);
        console.error('[Transactions] Error:', errorMessage);
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
        console.log('[Department Store] Total records:', records.length);

        if (records.length === 0) {
          results.errors.push('Department Store: CSV vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[Department Store] Headers:', headers);

          const idxClienteId = getIndex(headers, ['CNPJ', 'CPF/CNPJ']);
          const idxIdExterno = getIndex(headers, ['ID', 'ID Externo', 'Código', 'Codigo']);
          const idxNome = getIndex(headers, ['Nome', 'Razão Social', 'Razao Social', 'Cliente']);
          const idxTipoPessoa = getIndex(headers, ['Tipo Pessoa', 'Tipo']);
          const idxCpf = getIndex(headers, ['CPF']);
          const idxTipo = getIndex(headers, ['Tipo', 'Categoria']);
          const idxMarketplace = getIndex(headers, ['Marketplace']);
          const idxRepresentante = getIndex(headers, ['Representante', 'Distribuidor']);
          const idxPlano = getIndex(headers, ['Plano']);
          const idxCidade = getIndex(headers, ['Cidade']);
          const idxUf = getIndex(headers, ['UF', 'Estado']);
          const idxRazaoSocial = getIndex(headers, ['Razão Social', 'Razao Social']);
          const idxEmail = getIndex(headers, ['Email', 'E-mail']);
          const idxTelefone = getIndex(headers, ['Telefone', 'Fone']);
          const idxEtapa = getIndex(headers, ['Etapa', 'Status Etapa']);
          const idxDataCadastro = getIndex(headers, ['Data Cadastro', 'Data', 'Criado em']);
          const idxStatus = getIndex(headers, ['Status']);

          console.log('[Department Store] Column indices:', { idxClienteId, idxIdExterno, idxNome });

          // Clear existing department store data
          await supabaseClient.from('department_store').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          let processedCount = 0;
          let skippedCount = 0;

          // Process data rows (skip header)
          for (let i = 1; i < records.length; i++) {
            const record = records[i];
            const clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
            const idExterno = idxIdExterno >= 0 ? String(record[idxIdExterno] || '').trim() : '';
            const nome = idxNome >= 0 ? String(record[idxNome] || '').trim() : '';

            const clienteId = normalizeCnpj(clienteIdRaw);

            if (!clienteId || !nome) {
              skippedCount++;
              console.log('[Department Store] Skipping row', i, '- missing CNPJ or nome');
              continue;
            }

            const tipoPessoa = idxTipoPessoa >= 0 ? String(record[idxTipoPessoa] || '').trim() : '';
            const cpf = idxCpf >= 0 ? String(record[idxCpf] || '').trim() : '';
            const tipo = idxTipo >= 0 ? String(record[idxTipo] || '').trim() : '';
            const marketplace = idxMarketplace >= 0 ? String(record[idxMarketplace] || '').trim() : '';
            const representante = idxRepresentante >= 0 ? String(record[idxRepresentante] || '').trim() : '';
            const plano = idxPlano >= 0 ? String(record[idxPlano] || '').trim() : '';
            const cidade = idxCidade >= 0 ? String(record[idxCidade] || '').trim() : '';
            const uf = idxUf >= 0 ? String(record[idxUf] || '').trim() : '';
            const razaoSocial = idxRazaoSocial >= 0 ? String(record[idxRazaoSocial] || '').trim() : '';
            const email = idxEmail >= 0 ? String(record[idxEmail] || '').trim() : '';
            const telefone = idxTelefone >= 0 ? String(record[idxTelefone] || '').trim() : '';
            const etapa = idxEtapa >= 0 ? String(record[idxEtapa] || '').trim() : '';
            const dataCadastroStr = idxDataCadastro >= 0 ? String(record[idxDataCadastro] || '').trim() : '';
            const status = idxStatus >= 0 ? String(record[idxStatus] || '').trim() : '';

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
              cnpj: clienteIdRaw || null, // Store original CNPJ format in cnpj column
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
              results.errors.push(`Department Store linha ${i}: ${error.message}`);
            }
          }
          console.log('[Department Store] Processed:', processedCount, 'Skipped:', skippedCount);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Department Store] Error:', errorMessage);
        results.errors.push(`Department Store: ${errorMessage}`);
      }
    }

    // Calculate statistics
    try {
      // Get distinct wallet IDs
      const { data: walletData, error: walletError } = await supabaseClient
        .from('wallet')
        .select('cliente_id');
      
      if (!walletError && walletData) {
        const uniqueWalletIds = new Set(walletData.map(w => w.cliente_id));
        results.stats.walletIds = uniqueWalletIds.size;
      }

      // Get distinct transaction IDs
      const { data: txData, error: txError } = await supabaseClient
        .from('transactions')
        .select('cliente_id');
      
      if (!txError && txData) {
        const uniqueTxIds = new Set(txData.map(t => t.cliente_id));
        results.stats.txIds = uniqueTxIds.size;
        
        // Calculate intersection
        if (walletData) {
          const walletIds = new Set(walletData.map(w => w.cliente_id));
          results.stats.intersection = txData.filter(t => walletIds.has(t.cliente_id)).length;
        }
      }

      console.log('[Stats]', results.stats);
    } catch (error) {
      console.error('[Stats] Error calculating statistics:', error);
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