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
      admissoes: {
        Row: {
          cargo: string | null
          created_at: string
          data_efetiva: string | null
          data_header: string | null
          id: number
          memorando: string | null
          nome: string
          observacao: string | null
          prontuario: string | null
          secretaria: string | null
          telefone: string | null
          tipo_movimentacao: string | null
          vinculo: string | null
          vinculo_categoria: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          data_efetiva?: string | null
          data_header?: string | null
          id?: number
          memorando?: string | null
          nome: string
          observacao?: string | null
          prontuario?: string | null
          secretaria?: string | null
          telefone?: string | null
          tipo_movimentacao?: string | null
          vinculo?: string | null
          vinculo_categoria?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string
          data_efetiva?: string | null
          data_header?: string | null
          id?: number
          memorando?: string | null
          nome?: string
          observacao?: string | null
          prontuario?: string | null
          secretaria?: string | null
          telefone?: string | null
          tipo_movimentacao?: string | null
          vinculo?: string | null
          vinculo_categoria?: string | null
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          cargo_fila_id: string
          classificacao: number | null
          data_convocacao: string | null
          documento: string | null
          id: string
          inscricao: string | null
          lista_tipo: string
          nome: string
          nota: number | null
          observacao: string | null
          ordem_linha: number | null
          status: string
          updated_at: string
        }
        Insert: {
          cargo_fila_id: string
          classificacao?: number | null
          data_convocacao?: string | null
          documento?: string | null
          id?: string
          inscricao?: string | null
          lista_tipo?: string
          nome: string
          nota?: number | null
          observacao?: string | null
          ordem_linha?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          cargo_fila_id?: string
          classificacao?: number | null
          data_convocacao?: string | null
          documento?: string | null
          id?: string
          inscricao?: string | null
          lista_tipo?: string
          nome?: string
          nota?: number | null
          observacao?: string | null
          ordem_linha?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_cargo_fila_id_fkey"
            columns: ["cargo_fila_id"]
            isOneToOne: false
            referencedRelation: "cargos_fila"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos_fila: {
        Row: {
          codigo: string | null
          concurso_id: string
          id: string
          nome_normalizado: string
          nome_original: string
          secao: string
        }
        Insert: {
          codigo?: string | null
          concurso_id: string
          id?: string
          nome_normalizado: string
          nome_original: string
          secao?: string
        }
        Update: {
          codigo?: string | null
          concurso_id?: string
          id?: string
          nome_normalizado?: string
          nome_original?: string
          secao?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_fila_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
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
      concursos: {
        Row: {
          created_at: string
          data_homologacao: string | null
          data_realizacao: string | null
          data_vencimento: string | null
          id: string
          nome: string | null
          numero: string
          prorrogado_ate: string | null
          sheet_origem: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          data_homologacao?: string | null
          data_realizacao?: string | null
          data_vencimento?: string | null
          id?: string
          nome?: string | null
          numero: string
          prorrogado_ate?: string | null
          sheet_origem?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          data_homologacao?: string | null
          data_realizacao?: string | null
          data_vencimento?: string | null
          id?: string
          nome?: string | null
          numero?: string
          prorrogado_ate?: string | null
          sheet_origem?: string | null
          tipo?: string
        }
        Relationships: []
      }
      convocacoes_log: {
        Row: {
          acao: string
          candidato_id: string
          criado_em: string
          id: string
          observacao: string | null
          status_anterior: string | null
          status_novo: string | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          candidato_id: string
          criado_em?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          candidato_id?: string
          criado_em?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convocacoes_log_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      evolucoes_funcionais: {
        Row: {
          cargo_atual_codigo: number | null
          cargo_atual_nome: string | null
          cargo_conciliacao: string | null
          created_at: string
          data_admissao: string | null
          data_rescisao: string | null
          evolucao_cargo_codigo: number | null
          evolucao_cargo_nome: string | null
          evolucao_data: string | null
          evolucao_fundamento: string | null
          fundamento_categoria: string | null
          id: number
          matricula: string
          nome: string
          rescisao_codigo: number | null
          rescisao_descricao: string | null
          secretaria: string | null
          secretaria_codigo: number | null
          secretaria_nome: string | null
          sigla: string | null
          vinculo_codigo: number | null
          vinculo_nome: string | null
        }
        Insert: {
          cargo_atual_codigo?: number | null
          cargo_atual_nome?: string | null
          cargo_conciliacao?: string | null
          created_at?: string
          data_admissao?: string | null
          data_rescisao?: string | null
          evolucao_cargo_codigo?: number | null
          evolucao_cargo_nome?: string | null
          evolucao_data?: string | null
          evolucao_fundamento?: string | null
          fundamento_categoria?: string | null
          id?: number
          matricula: string
          nome: string
          rescisao_codigo?: number | null
          rescisao_descricao?: string | null
          secretaria?: string | null
          secretaria_codigo?: number | null
          secretaria_nome?: string | null
          sigla?: string | null
          vinculo_codigo?: number | null
          vinculo_nome?: string | null
        }
        Update: {
          cargo_atual_codigo?: number | null
          cargo_atual_nome?: string | null
          cargo_conciliacao?: string | null
          created_at?: string
          data_admissao?: string | null
          data_rescisao?: string | null
          evolucao_cargo_codigo?: number | null
          evolucao_cargo_nome?: string | null
          evolucao_data?: string | null
          evolucao_fundamento?: string | null
          fundamento_categoria?: string | null
          id?: number
          matricula?: string
          nome?: string
          rescisao_codigo?: number | null
          rescisao_descricao?: string | null
          secretaria?: string | null
          secretaria_codigo?: number | null
          secretaria_nome?: string | null
          sigla?: string | null
          vinculo_codigo?: number | null
          vinculo_nome?: string | null
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
      rescisoes: {
        Row: {
          cargo_codigo: number | null
          cargo_nome: string
          created_at: string
          data_admissao: string
          data_rescisao: string
          dias_permanencia: number
          id: number
          matricula: string | null
          motivo_categoria: string
          nome: string
          rescisao_codigo: number
          rescisao_descricao: string
          secretaria_codigo: number | null
          secretaria_nome: string
          vinculo_categoria: string
          vinculo_nome: string
        }
        Insert: {
          cargo_codigo?: number | null
          cargo_nome: string
          created_at?: string
          data_admissao: string
          data_rescisao: string
          dias_permanencia: number
          id?: number
          matricula?: string | null
          motivo_categoria: string
          nome: string
          rescisao_codigo: number
          rescisao_descricao: string
          secretaria_codigo?: number | null
          secretaria_nome: string
          vinculo_categoria: string
          vinculo_nome: string
        }
        Update: {
          cargo_codigo?: number | null
          cargo_nome?: string
          created_at?: string
          data_admissao?: string
          data_rescisao?: string
          dias_permanencia?: number
          id?: number
          matricula?: string | null
          motivo_categoria?: string
          nome?: string
          rescisao_codigo?: number
          rescisao_descricao?: string
          secretaria_codigo?: number | null
          secretaria_nome?: string
          vinculo_categoria?: string
          vinculo_nome?: string
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
