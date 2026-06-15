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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      concurso_publico: {
        Row: {
          cargo: string
          created_at: string
          data_homologacao: string | null
          desistencias_renuncias: number | null
          homologacao_status: string | null
          id: string
          memo: string | null
          numero: string | null
          pedidos_abertos: number | null
          pedidos_andamento: number | null
          prorrogacao: string | null
          prova_pratica: string | null
          qtd_aprovados: number | null
          qtd_atendida: number | null
          regularizar: string | null
          total_disponivel: number
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          cargo: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          memo?: string | null
          numero?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          prova_pratica?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          regularizar?: string | null
          total_disponivel?: number
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          memo?: string | null
          numero?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          prova_pratica?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          regularizar?: string | null
          total_disponivel?: number
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      processo_seletivo: {
        Row: {
          cargo: string
          created_at: string
          data_homologacao: string | null
          desistencias_renuncias: number | null
          homologacao_status: string | null
          id: string
          memo: string | null
          numero: string | null
          pedidos_abertos: number | null
          pedidos_andamento: number | null
          prorrogacao: string | null
          qtd_aprovados: number | null
          qtd_atendida: number | null
          total_disponivel: number
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          cargo: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          memo?: string | null
          numero?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          total_disponivel?: number
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          memo?: string | null
          numero?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          total_disponivel?: number
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      vencimentos: {
        Row: {
          cargo: string
          created_at: string
          data_alvo: string | null
          data_homologacao: string | null
          dias_restantes: number | null
          id: string
          numero: string | null
          prorrogacao: string | null
          status: string | null
          tipo: string
          vencimento_original: string | null
        }
        Insert: {
          cargo: string
          created_at?: string
          data_alvo?: string | null
          data_homologacao?: string | null
          dias_restantes?: number | null
          id?: string
          numero?: string | null
          prorrogacao?: string | null
          status?: string | null
          tipo: string
          vencimento_original?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          data_alvo?: string | null
          data_homologacao?: string | null
          dias_restantes?: number | null
          id?: string
          numero?: string | null
          prorrogacao?: string | null
          status?: string | null
          tipo?: string
          vencimento_original?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
