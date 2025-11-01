import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LoadDataRequest {
  participantsUrl: string;
  walletUrl: string;
  transactionsUrl: string;
  departmentStoreUrl: string;
}

interface LoadDataResponse {
  participants: number;
  wallet: number;
  transactions: number;
  departmentStore: number;
  errors: string[];
}

export const useLoadData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LoadDataResponse | null>(null);
  const { toast } = useToast();

  const loadData = async (urls: LoadDataRequest) => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('load-data', {
        body: urls,
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Dados carregados com sucesso!",
        description: `${data.participants} participantes, ${data.wallet} carteira, ${data.transactions} transações, ${data.departmentStore} estabelecimentos`,
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
