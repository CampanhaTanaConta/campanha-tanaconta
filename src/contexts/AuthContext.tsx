import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  userEmail: string | null;
  participante: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; participante?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [participante, setParticipante] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedEmail = localStorage.getItem('userEmail');
    const storedParticipante = localStorage.getItem('participante');
    
    if (storedEmail && storedParticipante) {
      setUserEmail(storedEmail);
      setParticipante(storedParticipante);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Query participant data
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (participantError) {
        console.error('Error fetching participant:', participantError);
        return { success: false, error: 'Erro ao buscar dados do participante' };
      }

      if (!participant) {
        return { success: false, error: 'E-mail não encontrado' };
      }

      // Hash the provided password
      const hashedPassword = CryptoJS.SHA256(password).toString();

      // Compare with stored hash
      if (hashedPassword !== participant.birth_hash) {
        return { success: false, error: 'Senha incorreta' };
      }

      // Set session
      setUserEmail(normalizedEmail);
      setParticipante(participant.participante);
      
      // Store in localStorage
      localStorage.setItem('userEmail', normalizedEmail);
      localStorage.setItem('participante', participant.participante);

      return { success: true, participante: participant.participante };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    setUserEmail(null);
    setParticipante(null);
    localStorage.removeItem('userEmail');
    localStorage.removeItem('participante');
  };

  return (
    <AuthContext.Provider value={{ userEmail, participante, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};