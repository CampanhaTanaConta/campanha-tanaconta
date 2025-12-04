import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.203.0/csv/mod.ts';
import { format, parse as parseDate } from 'https://deno.land/std@0.203.0/datetime/mod.ts';
import CryptoJS from 'https://esm.sh/crypto-js@4.2.0';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoadDataRequest {
  participantsUrl?: string;
  walletUrl?: string;
  transactionsUrl?: string;
  departmentStoreUrl?: string;
  solarSalesUrl?: string;
  participantsContent?: string;
  walletContent?: string;
  transactionsContent?: string;
  departmentStoreContent?: string;
  solarSalesContent?: string;
}

// Utility: Detect file format (CSV vs XLSX)
function detectFileFormat(content: string): 'csv' | 'xlsx' {
  // Base64 de XLSX começa com UEsDB (PK signature em base64)
  if (content.startsWith('UEsDB') || content.startsWith('UEs')) {
    return 'xlsx';
  }
  return 'csv';
}

// Utility: Parse XLSX file from base64 content
function parseXlsx(base64Content: string): string[][] {
  try {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const workbook = XLSX.read(bytes, { 
      type: 'array',
      cellDates: false,  // Don't convert dates automatically
      cellNF: false,     // Don't apply number formatting
      raw: false,        // Force string conversion
    });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log('[XLSX] Parsing sheet:', sheetName);
    
    // Convert to array of arrays, forcing all values to strings
    const records: string[][] = XLSX.utils.sheet_to_json(sheet, { 
      header: 1,      // Return as array of arrays
      raw: false,     // Force strings
      defval: '',     // Default value for empty cells
    });
    
    console.log('[XLSX] Parsed', records.length, 'rows');
    return records;
  } catch (error) {
    console.error('[XLSX] Parse error:', error);
    throw new Error(`Erro ao parsear arquivo Excel: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Utility: Parse content (auto-detect CSV vs XLSX)
function parseContent(content: string, sourceName: string): { records: string[][], format: string } {
  const format = detectFileFormat(content);
  console.log(`[${sourceName}] Detected format: ${format}`);
  
  if (format === 'xlsx') {
    const records = parseXlsx(content);
    return { records, format: 'xlsx' };
  } else {
    // CSV processing
    const { text: processedCsv, separator } = preprocessCsv(content);
    const records = parse(processedCsv, { skipFirstRow: false, separator });
    return { records: records as string[][], format: 'csv' };
  }
}

// Utility: Normalize CNPJ to 14 digits (remove non-digits, left-pad with zeros)
function normalizeCnpj(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  
  const normalized = digits.padStart(14, '0');
  
  // Detectar possível perda de precisão (CNPJs terminando em muitos zeros)
  if (normalized.endsWith('00000000') || normalized.endsWith('0000000')) {
    console.warn(`[CNPJ Warning] Possível perda de precisão: ${normalized} (original: ${value}). Recomendado usar formato XLSX.`);
  }
  
  return normalized;
}

// Utility: Find column index by header name (case-insensitive, accent-insensitive, punctuation-insensitive)
function getIndex(headers: string[], candidates: string[]): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, '');

  const normalizedHeaders = headers.map(normalize);
  
  // First pass: exact match
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const idx = normalizedHeaders.indexOf(normalizedCandidate);
    if (idx !== -1) return idx;
  }
  
  // Second pass: contains match
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const idx = normalizedHeaders.findIndex(h => h.includes(normalizedCandidate) || normalizedCandidate.includes(h));
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

// Utility: Remove BOM from text
// Utility: Parse CNPJ in Brazilian scientific notation (e.g., 4,70188E+13)
// Uses string manipulation to preserve all 14 digits (parseFloat loses precision)
function parseScientificCnpj(value: string): string {
  if (!value) return '';
  
  // Detect Brazilian scientific notation (e.g., 4,70188E+13 or 4.70188E+13)
  const match = value.match(/^(\d+)[,.](\d+)[eE]\+?(\d+)$/);
  if (match) {
    const [, intPart, decPart, expStr] = match;
    const exp = parseInt(expStr, 10);
    const fullNumber = intPart + decPart;
    const targetLength = exp + 1;
    
    // Pad with zeros if needed, or truncate if too long
    if (fullNumber.length < targetLength) {
      const result = fullNumber.padEnd(targetLength, '0');
      // Log warning if we're padding with many zeros (indicates precision loss)
      if (targetLength - fullNumber.length >= 5) {
        console.warn(`[CNPJ Scientific] Padding with ${targetLength - fullNumber.length} zeros - likely precision loss: ${value} -> ${result}`);
      }
      return result;
    }
    return fullNumber.slice(0, targetLength);
  }
  
  return value;
}

function removeBom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

// Utility: Detect CSV separator from both header AND data lines
function detectSeparator(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  
  // Check multiple lines (header + first few data lines) for more reliable detection
  const linesToCheck = lines.slice(0, Math.min(5, lines.length));
  
  let totalSemicolons = 0;
  let totalCommas = 0;
  
  for (const line of linesToCheck) {
    // Count separators outside of quoted strings
    let inQuotes = false;
    let semicolons = 0;
    let commas = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === ';') semicolons++;
        if (char === ',') commas++;
      }
    }
    
    totalSemicolons += semicolons;
    totalCommas += commas;
  }
  
  console.log('[CSV] Separator detection across', linesToCheck.length, 'lines - semicolons:', totalSemicolons, 'commas:', totalCommas);
  
  // Use the more frequent delimiter
  if (totalSemicolons > totalCommas) {
    console.log('[CSV] Detected separator: semicolon (;)');
    return ';';
  }
  
  console.log('[CSV] Detected separator: comma (,)');
  return ',';
}

// Utility: Normalize CSV to use comma separator
function normalizeCsvSeparator(text: string): string {
  const cleanText = removeBom(text);
  const separator = detectSeparator(cleanText);
  
  if (separator === ',') return cleanText;
  
  // Replace semicolons with commas, but preserve semicolons inside quoted fields
  const lines = cleanText.split(/\r?\n/);
  const normalizedLines = lines.map(line => {
    let result = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
        result += char;
      } else if (char === ';' && !inQuotes) {
        result += ',';
      } else {
        result += char;
      }
    }
    
    return result;
  });
  
  console.log('[CSV] Normalized separator from semicolon to comma');
  return normalizedLines.join('\n');
}

// Utility: Clean CSV text to handle malformed quotes
function cleanCsvText(text: string): string {
  const lines = text.split(/\r?\n/);
  const cleanedLines = lines.map(line => {
    let inQuotedField = false;
    let result = '';
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (!inQuotedField && (i === 0 || prevChar === ',' || prevChar === ';')) {
          // Start of quoted field
          inQuotedField = true;
          result += char;
        } else if (inQuotedField && nextChar === '"') {
          // Escaped quote inside quoted field
          result += '""';
          i++;
        } else if (inQuotedField && (nextChar === ',' || nextChar === ';' || nextChar === undefined || nextChar === '\r')) {
          // End of quoted field
          inQuotedField = false;
          result += char;
        } else if (!inQuotedField) {
          // Bare quote in non-quoted field - remove it
          console.log('[CSV Cleaner] Removing bare quote at position', i);
        } else {
          result += char;
        }
      } else {
        result += char;
      }
      i++;
    }
    return result;
  });
  return cleanedLines.join('\n');
}

// Utility: Full CSV preprocessing (BOM removal, quote cleaning) - returns text AND detected separator
function preprocessCsv(text: string): { text: string; separator: string } {
  const cleanedText = removeBom(text);
  const separator = detectSeparator(cleanedText);
  const finalText = cleanCsvText(cleanedText);
  console.log('[CSV] Using native separator:', separator);
  return { text: finalText, separator };
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
      solarSalesUrl,
      participantsContent,
      walletContent,
      transactionsContent,
      departmentStoreContent,
      solarSalesContent
    }: LoadDataRequest = await req.json();

    const results = {
      participants: 0,
      wallet: 0,
      transactions: 0,
      departmentStore: 0,
      solarSales: 0,
      solarUpdated: 0,
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
        let content: string;
        if (participantsContent) {
          content = participantsContent;
        } else {
          const response = await fetch(participantsUrl!);
          content = await response.text();
        }
        
        const { records, format } = parseContent(content, 'Participants');
        console.log('[Participants] Total records:', records.length, 'Format:', format);

        // Skip header row manually (start from index 1)
        for (let i = 1; i < records.length; i++) {
          const record = records[i];
          const distribuidor = String(record[0] || '').trim(); // Column 0 = Distribuidor
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
                distribuidor: distribuidor || null,
              },
              { onConflict: 'email' }
            );

          if (error) {
            console.error(`[Participants] Insert error row ${i}:`, error.message);
            results.errors.push(`Participants linha ${i}: ${error.message}`);
          } else {
            results.participants++;
          }
        }
        
        // Validate insertion count
        const expectedRows = records.length - 1;
        if (results.participants === 0 && expectedRows > 0) {
          results.errors.push(`Participants: Nenhum registro inserido de ${expectedRows} linhas. Verifique o formato do arquivo.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Participants: ${errorMessage}`);
        console.error('[Participants] Error:', errorMessage);
      }
    }

    // Load wallet data
    if (walletContent || walletUrl) {
      try {
        let content: string;
        if (walletContent) {
          content = walletContent;
        } else {
          const response = await fetch(walletUrl!);
          content = await response.text();
        }
        
        const { records, format } = parseContent(content, 'Wallet');
        console.log('[Wallet] Total records:', records.length, 'Format:', format);

        if (records.length === 0) {
          results.errors.push('Wallet: Arquivo vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[Wallet] Headers:', headers);

          const idxClienteNome = getIndex(headers, ['Cliente', 'Razão Social', 'Nome', 'Estab Comercial', 'Estabelecimento']);
          const idxClienteId = getIndex(headers, ['CNPJ', 'CPF/CNPJ', 'CPF/CNPJ Estab Comercial', 'CNPJ/CPF', 'Documento']);
          const idxDistribuidor = getIndex(headers, ['Distribuidor', 'Representante', 'Responsável']);
          const idxParticipante = getIndex(headers, ['Participante', 'Vendedor', 'Consultor', 'Responsável']);

          console.log('[Wallet] Column indices:', { idxClienteNome, idxClienteId, idxDistribuidor, idxParticipante });

          // Validate required columns
          if (idxClienteId === -1 || idxParticipante === -1) {
            results.errors.push('Wallet: Colunas obrigatórias não encontradas (CNPJ e Participante)');
            console.error('[Wallet] Missing required columns. Headers:', headers);
          } else {
            // Clear existing wallet data only if we have valid columns
            await supabaseClient.from('wallet').delete().neq('id', '00000000-0000-0000-0000-000000000000');

            // Process data rows (skip header)
            for (let i = 1; i < records.length; i++) {
              const record = records[i];
              const clienteNome = idxClienteNome >= 0 ? String(record[idxClienteNome] || '').trim() : '';
              let clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
              const distribuidor = idxDistribuidor >= 0 ? String(record[idxDistribuidor] || '').trim() : '';
              const participante = idxParticipante >= 0 ? String(record[idxParticipante] || '').trim() : '';

              // Handle scientific notation for CSV
              if (format === 'csv') {
                clienteIdRaw = parseScientificCnpj(clienteIdRaw);
              }
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

              if (error) {
                console.error(`[Wallet] Insert error row ${i}:`, error.message);
                results.errors.push(`Wallet linha ${i}: ${error.message}`);
              } else {
                results.wallet++;
              }
            }
            
            // Validate insertion count
            const expectedRows = records.length - 1;
            if (results.wallet === 0 && expectedRows > 0) {
              results.errors.push(`Wallet: Nenhum registro inserido de ${expectedRows} linhas. Verifique o formato do arquivo.`);
            }
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
        let content: string;
        if (transactionsContent) {
          content = transactionsContent;
        } else {
          const response = await fetch(transactionsUrl!);
          content = await response.text();
        }
        
        const { records, format } = parseContent(content, 'Transactions');
        console.log('[Transactions] Total records:', records.length, 'Format:', format);

        if (records.length === 0) {
          results.errors.push('Transactions: Arquivo vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[Transactions] Headers:', headers);

          const idxClienteId = getIndex(headers, ['CNPJ', 'CPF/CNPJ', 'CPF/CNPJ Estab Comercial', 'CNPJ/CPF', 'Documento']);
          const idxDataTransacao = getIndex(headers, ['Data', 'Data Transação', 'Data Transacao', 'Emissão', 'Emissao', 'Data Emissao']);
          const idxTipoVenda = getIndex(headers, ['Tipo Venda', 'Tipo da Venda', 'Categoria', 'Produto', 'Tipo']);
          const idxTotalParcela = getIndex(headers, ['Total Parcela', 'Total Parcela(R$)', 'Valor Líquido', 'Valor Liquido', 'Valor', 'Total']);
          const idxPremiacaoPct = getIndex(headers, ['Premiação %', 'Premiacao %', 'Premiação', 'Premiacao', 'Comissão %', 'Comissao %']);
          const idxEstabComercial = getIndex(headers, ['Estab. Comercial', 'Estab Comercial', 'Estabelecimento Comercial', 'Nome Fantasia', 'Fantasia']);

          console.log('[Transactions] Column indices:', { idxClienteId, idxDataTransacao, idxTipoVenda, idxTotalParcela, idxPremiacaoPct });

          // Validate required columns
          if (idxClienteId === -1 || idxDataTransacao === -1 || idxTipoVenda === -1 || idxTotalParcela === -1) {
            results.errors.push('Transactions: Colunas obrigatórias não encontradas (CNPJ, Data, Tipo e Valor)');
            console.error('[Transactions] Missing required columns. Headers:', headers);
          } else {
            // Clear existing transactions only if we have valid columns
            await supabaseClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

            // Check if we have a dedicated solar sales file
            const hasSolarFile = !!(solarSalesContent || solarSalesUrl);

            // Process data rows (skip header)
            for (let i = 1; i < records.length; i++) {
              const record = records[i];
              let clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
              const dataTransacao = idxDataTransacao >= 0 ? String(record[idxDataTransacao] || '').trim() : '';
              const tipoVenda = idxTipoVenda >= 0 ? String(record[idxTipoVenda] || '').trim() : '';
              const totalParcelaStr = idxTotalParcela >= 0 ? String(record[idxTotalParcela] || '0').trim() : '0';
              const premiacaoPctStr = idxPremiacaoPct >= 0 ? String(record[idxPremiacaoPct] || '0').trim() : '0';
              const estabComercial = idxEstabComercial >= 0 ? String(record[idxEstabComercial] || '').trim() : '';

              // Handle scientific notation for CSV
              if (format === 'csv') {
                clienteIdRaw = parseScientificCnpj(clienteIdRaw);
              }
              const clienteId = normalizeCnpj(clienteIdRaw);

              if (!clienteId || !dataTransacao || !tipoVenda) {
                console.log('[Transactions] Skipping row', i, '- missing CNPJ, date, or tipo');
                continue;
              }

              // Skip Energia Solar rows if dedicated file is provided
              if (hasSolarFile && tipoVenda === 'Energia Solar') {
                console.log('[Transactions] Skipping Solar row', i, '- dedicated file provided');
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

              // Determine premium percentage
              let premiacaoPctNorm: number;
              let premiacaoValor: number;

              // If no premium column exists or value is '0', use default 0.1%
              if (idxPremiacaoPct === -1 || !premiacaoPctStr || premiacaoPctStr === '0') {
                premiacaoPctNorm = 0.001; // 0.1% default for Transactions file
                premiacaoValor = totalParcelaNum * premiacaoPctNorm;
                console.log(`[Transactions] Using default 0.1% premium`);
              } else {
                // Parse premium column if it exists (handle 10, 10%, 0.10%, 0,10%)
                const hasPercent = premiacaoPctStr.includes('%');
                const premiacaoPctCleaned = premiacaoPctStr.replace('%', '').replace(',', '.');
                premiacaoPctNorm = parseFloat(premiacaoPctCleaned) || 0.001;
                
                if (hasPercent) {
                  premiacaoPctNorm = premiacaoPctNorm / 100;
                } else if (premiacaoPctNorm > 1) {
                  premiacaoPctNorm = premiacaoPctNorm / 100;
                }
                
                premiacaoValor = totalParcelaNum * premiacaoPctNorm;
              }

              const { error } = await supabaseClient.from('transactions').insert({
                cliente_id: clienteId,
                data_transacao: date,
                tipo_venda: tipoVenda,
                total_parcela: totalParcelaNum,
                premiacao_pct_norm: premiacaoPctNorm,
                premiacao_valor: premiacaoValor,
                estab_comercial: estabComercial || null,
              });

              if (error) {
                console.error(`[Transactions] Insert error row ${i}:`, error.message);
                results.errors.push(`Transactions linha ${i}: ${error.message}`);
              } else {
                results.transactions++;
              }
            }
            
            // Validate insertion count
            const expectedRows = records.length - 1;
            if (results.transactions === 0 && expectedRows > 0) {
              results.errors.push(`Transactions: Nenhum registro inserido de ${expectedRows} linhas. Verifique o formato do arquivo.`);
            }
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
        let content: string;
        if (departmentStoreContent) {
          console.log('[Department Store] Using content, length:', departmentStoreContent.length);
          content = departmentStoreContent;
        } else {
          console.log('[Department Store] Fetching from URL:', departmentStoreUrl);
          const response = await fetch(departmentStoreUrl!);
          content = await response.text();
        }
        
        const { records, format } = parseContent(content, 'Department Store');
        console.log('[Department Store] Total records:', records.length, 'Format:', format);

        if (records.length === 0) {
          results.errors.push('Department Store: Arquivo vazio');
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
            let clienteIdRaw = idxClienteId >= 0 ? String(record[idxClienteId] || '').trim() : '';
            const cpfRaw = idxCpf >= 0 ? String(record[idxCpf] || '').trim() : '';
            const idExterno = idxIdExterno >= 0 ? String(record[idxIdExterno] || '').trim() : '';
            const nome = idxNome >= 0 ? String(record[idxNome] || '').trim() : '';

            // Handle scientific notation for CSV
            if (format === 'csv') {
              clienteIdRaw = parseScientificCnpj(clienteIdRaw);
            }

            // Use CPF as fallback if CNPJ is empty
            const documentoRaw = clienteIdRaw || cpfRaw;
            const clienteId = normalizeCnpj(documentoRaw);

            if (!clienteId || !nome) {
              skippedCount++;
              console.log('[Department Store] Skipping row', i, '- missing CNPJ/CPF or nome');
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

    // Load solar sales data - Aggregate by CNPJ and insert into solar_sales table
    if (solarSalesContent || solarSalesUrl) {
      try {
        let content: string;
        if (solarSalesContent) {
          content = solarSalesContent;
        } else {
          const response = await fetch(solarSalesUrl!);
          content = await response.text();
        }
        
        const { records, format } = parseContent(content, 'SolarSales');
        console.log('[SolarSales] Total records:', records.length, 'Format:', format);

        if (records.length === 0) {
          results.errors.push('Solar Sales: Arquivo vazio');
        } else {
          const headers = records[0].map((h: any) => String(h).trim());
          console.log('[SolarSales] Headers:', headers);

          // Map columns
          const idxCnpj = getIndex(headers, ['CNPJ', 'CPF/CNPJ', 'Documento do EC', 'Documento EC', 'Doc EC']);
          const idxValor = getIndex(headers, ['Valor', 'Total', 'Total Parcela']);

          console.log('[SolarSales] Column indices:', { idxCnpj, idxValor });

          // Validate required columns
          if (idxCnpj === -1 || idxValor === -1) {
            results.errors.push('Solar Sales: Colunas obrigatórias não encontradas (CNPJ, Valor)');
            console.error('[SolarSales] Missing required columns. Headers:', headers);
          } else {
            // Clear existing solar_sales data before inserting
            await supabaseClient.from('solar_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            console.log('[SolarSales] Cleared existing solar_sales records');

            // Aggregate solar values by CNPJ
            const solarByClient: Map<string, number> = new Map();
            let solarLinesProcessed = 0;

            for (let i = 1; i < records.length; i++) {
              const record = records[i];
              
              let cnpjRaw = idxCnpj >= 0 ? String(record[idxCnpj] || '').trim() : '';
              const valorStr = idxValor >= 0 ? String(record[idxValor] || '0').trim() : '0';

              // Handle CNPJ in scientific notation (for CSV only)
              if (format === 'csv') {
                cnpjRaw = parseScientificCnpj(cnpjRaw);
              }
              const clienteId = normalizeCnpj(cnpjRaw);

              if (!clienteId) {
                console.log('[SolarSales] Skipping row', i, '- missing CNPJ');
                continue;
              }

              // Count each valid line processed
              solarLinesProcessed++;

              // Parse value (Brazilian format)
              const valor = parseBrazilianNumber(valorStr);
              
              // Aggregate by CNPJ
              const current = solarByClient.get(clienteId) || 0;
              solarByClient.set(clienteId, current + valor);
              console.log(`[SolarSales] Row ${i}: CNPJ ${clienteId}, valor ${valor}, total ${current + valor}`);
            }

            console.log(`[SolarSales] Processed ${solarLinesProcessed} lines, aggregated to ${solarByClient.size} unique CNPJs`);

            // Insert aggregated values into solar_sales table
            for (const [clienteId, valorSolar] of solarByClient) {
              const { error } = await supabaseClient
                .from('solar_sales')
                .upsert({
                  cliente_id: clienteId,
                  valor_solar: valorSolar,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'cliente_id' });

              if (error) {
                console.error(`[SolarSales] Insert error for CNPJ ${clienteId}:`, error.message);
                results.errors.push(`Solar Sales CNPJ ${clienteId}: ${error.message}`);
              } else {
                console.log(`[SolarSales] Inserted CNPJ ${clienteId} with valor_solar ${valorSolar}`);
              }
            }
            
            // Set result as lines processed (not unique CNPJs)
            results.solarSales = solarLinesProcessed;
            
            // Validate insertion count
            if (solarByClient.size === 0 && solarLinesProcessed > 0) {
              results.errors.push(`Solar Sales: Nenhum registro inserido de ${solarLinesProcessed} linhas.`);
            }
            
            console.log(`[SolarSales] Total lines processed: ${solarLinesProcessed}, unique CNPJs: ${solarByClient.size}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Solar Sales: ${errorMessage}`);
        console.error('[SolarSales] Error:', errorMessage);
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
