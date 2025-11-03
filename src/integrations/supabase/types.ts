export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          birth_hash: string | null
          birth_raw: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string
        }
        Insert: {
          birth_hash?: string | null
          birth_raw?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
        }
        Update: {
          birth_hash?: string | null
          birth_raw?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string
        }
        Relationships: []
      }
      department_store: {
        Row: {
          cidade: string | null
          cliente_id: string
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          data_cadastro: string | null
          email: string | null
          etapa: string | null
          id: string
          id_externo: string | null
          marketplace: string | null
          nome: string
          plano: string | null
          razao_social: string | null
          representante: string | null
          status: string | null
          telefone: string | null
          tipo: string | null
          tipo_pessoa: string | null
          uf: string | null
        }
        Insert: {
          cidade?: string | null
          cliente_id: string
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          etapa?: string | null
          id?: string
          id_externo?: string | null
          marketplace?: string | null
          nome: string
          plano?: string | null
          razao_social?: string | null
          representante?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
        }
        Update: {
          cidade?: string | null
          cliente_id?: string
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          etapa?: string | null
          id?: string
          id_externo?: string | null
          marketplace?: string | null
          nome?: string
          plano?: string | null
          razao_social?: string | null
          representante?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          birth_hash: string
          birth_raw: string
          created_at: string | null
          email: string
          id: string
          participante: string
        }
        Insert: {
          birth_hash: string
          birth_raw: string
          created_at?: string | null
          email: string
          id?: string
          participante: string
        }
        Update: {
          birth_hash?: string
          birth_raw?: string
          created_at?: string | null
          email?: string
          id?: string
          participante?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_transacao: string
          id: string
          premiacao_pct_norm: number
          premiacao_valor: number
          tipo_venda: string
          total_parcela: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_transacao: string
          id?: string
          premiacao_pct_norm: number
          premiacao_valor: number
          tipo_venda: string
          total_parcela: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_transacao?: string
          id?: string
          premiacao_pct_norm?: number
          premiacao_valor?: number
          tipo_venda?: string
          total_parcela?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet: {
        Row: {
          cliente_id: string
          cliente_nome: string
          created_at: string | null
          distribuidor: string | null
          id: string
          participante: string
        }
        Insert: {
          cliente_id: string
          cliente_nome: string
          created_at?: string | null
          distribuidor?: string | null
          id?: string
          participante: string
        }
        Update: {
          cliente_id?: string
          cliente_nome?: string
          created_at?: string | null
          distribuidor?: string | null
          id?: string
          participante?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: {
        Args: { p_email: string }
        Returns: {
          email_found: boolean
          is_admin_user: boolean
          user_name: string
        }[]
      }
      get_admin_dashboard_data: { Args: never; Returns: Json }
      get_dashboard_slices: {
        Args: { p_email: string; p_participante: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_session: {
        Args: { p_email: string; p_participante: string }
        Returns: undefined
      }
      verify_admin_login: {
        Args: { p_email: string; p_password_hash: string }
        Returns: {
          is_admin: boolean
          is_valid: boolean
          user_id: string
          user_name: string
        }[]
      }
      verify_participant_login: {
        Args: { p_birth_hash: string; p_email: string }
        Returns: {
          is_admin: boolean
          is_valid: boolean
          user_id: string
          user_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
