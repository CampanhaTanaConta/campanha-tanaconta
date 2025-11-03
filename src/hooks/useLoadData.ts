import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface LoadDataResponse {
  participants: number;
  wallet: number;
  transactions: number;
  departmentStore: number;
  errors: string[];
  stats: {
    walletIds: number;
    txIds: number;
    intersection: number;
  };
}

export const useLoadData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LoadDataResponse | null>(null);
  const { toast } = useToast();

  const loadData = async (urls: LoadDataRequest) => {
    setIsLoading(true);
    setResult(null);

    const invokeWithRetry = async (body: LoadDataRequest, retries = 3, delayMs = 700): Promise<LoadDataResponse> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke('load-data', { body });
          if (error) throw error;
          return data as LoadDataResponse;
        } catch (err: unknown) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const transient = msg.includes('Failed to send a request to the Edge Function') || msg.includes('Failed to fetch') || msg.includes('network');
          if (!transient || attempt === retries) throw err;
          await new Promise((res) => setTimeout(res, delayMs * attempt));
        }
      }
      throw lastError as Error;
    };

    try {
      const data = await invokeWithRetry(urls);

      setResult(data);
      
      const statsMessage = data.stats 
        ? ` | CNPJs: ${data.stats.walletIds} carteira, ${data.stats.txIds} transações, ${data.stats.intersection} correspondências`
        : '';
      
      toast({
        title: "Dados carregados com sucesso!",
        description: `${data.participants} participantes, ${data.wallet} carteira, ${data.transactions} transações, ${data.departmentStore} estabelecimentos${statsMessage}`,
      });

      return data;
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { loadData, isLoading, result };
};
