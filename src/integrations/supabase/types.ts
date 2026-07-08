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
          cargo_id: string | null
          created_at: string
          data_efetiva: string | null
          data_header: string | null
          especialidade_id: string | null
          grupo_cargo_id: string | null
          id: number
          memorando: string | null
          nome: string
          observacao: string | null
          prontuario: string | null
          secretaria: string | null
          secretaria_id: string | null
          telefone: string | null
          tipo_movimentacao: string | null
          vinculo: string | null
          vinculo_categoria: string | null
          vinculo_id: string | null
        }
        Insert: {
          cargo?: string | null
          cargo_id?: string | null
          created_at?: string
          data_efetiva?: string | null
          data_header?: string | null
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: number
          memorando?: string | null
          nome: string
          observacao?: string | null
          prontuario?: string | null
          secretaria?: string | null
          secretaria_id?: string | null
          telefone?: string | null
          tipo_movimentacao?: string | null
          vinculo?: string | null
          vinculo_categoria?: string | null
          vinculo_id?: string | null
        }
        Update: {
          cargo?: string | null
          cargo_id?: string | null
          created_at?: string
          data_efetiva?: string | null
          data_header?: string | null
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: number
          memorando?: string | null
          nome?: string
          observacao?: string | null
          prontuario?: string | null
          secretaria?: string | null
          secretaria_id?: string | null
          telefone?: string | null
          tipo_movimentacao?: string | null
          vinculo?: string | null
          vinculo_categoria?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissoes_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "dim_especialidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissoes_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissoes_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "admissoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "admissoes_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
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
      chamamentos: {
        Row: {
          ano_publicacao: number | null
          cargo: string | null
          cargo_id: string | null
          cargo_normalizado: string | null
          classificacao: string | null
          classificacao_num: number | null
          cota: string | null
          created_at: string
          data_inicio: string | null
          data_memo: string | null
          data_publicacao: string | null
          especialidade_id: string | null
          grupo_cargo_id: string | null
          id: string
          memo_os: string | null
          motivo: string | null
          motivo_id: string | null
          nome: string | null
          numero: string | null
          numero_concurso: string | null
          observacao: string | null
          prazo_contrato: string | null
          prontuario: string | null
          regularizar_concurso: string | null
          responsavel: string | null
          secretaria: string
          secretaria_id: string | null
          situacao_id: string | null
          status: string
          tipo_concurso: string | null
        }
        Insert: {
          ano_publicacao?: number | null
          cargo?: string | null
          cargo_id?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          classificacao_num?: number | null
          cota?: string | null
          created_at?: string
          data_inicio?: string | null
          data_memo?: string | null
          data_publicacao?: string | null
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: string
          memo_os?: string | null
          motivo?: string | null
          motivo_id?: string | null
          nome?: string | null
          numero?: string | null
          numero_concurso?: string | null
          observacao?: string | null
          prazo_contrato?: string | null
          prontuario?: string | null
          regularizar_concurso?: string | null
          responsavel?: string | null
          secretaria: string
          secretaria_id?: string | null
          situacao_id?: string | null
          status?: string
          tipo_concurso?: string | null
        }
        Update: {
          ano_publicacao?: number | null
          cargo?: string | null
          cargo_id?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          classificacao_num?: number | null
          cota?: string | null
          created_at?: string
          data_inicio?: string | null
          data_memo?: string | null
          data_publicacao?: string | null
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: string
          memo_os?: string | null
          motivo?: string | null
          motivo_id?: string | null
          nome?: string | null
          numero?: string | null
          numero_concurso?: string | null
          observacao?: string | null
          prazo_contrato?: string | null
          prontuario?: string | null
          regularizar_concurso?: string | null
          responsavel?: string | null
          secretaria?: string
          secretaria_id?: string | null
          situacao_id?: string | null
          status?: string
          tipo_concurso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamamentos_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "dim_especialidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamamentos_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamamentos_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "chamamentos_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "dim_motivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamamentos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamamentos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "chamamentos_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "dim_situacao_chamamento"
            referencedColumns: ["id"]
          },
        ]
      }
      chamamentos_andamento_2026: {
        Row: {
          andamento: string | null
          cargo: string | null
          cargo_normalizado: string | null
          created_at: string
          fase_kanban: number | null
          id: string
          quantidade: number | null
          secretaria: string
        }
        Insert: {
          andamento?: string | null
          cargo?: string | null
          cargo_normalizado?: string | null
          created_at?: string
          fase_kanban?: number | null
          id?: string
          quantidade?: number | null
          secretaria: string
        }
        Update: {
          andamento?: string | null
          cargo?: string | null
          cargo_normalizado?: string | null
          created_at?: string
          fase_kanban?: number | null
          id?: string
          quantidade?: number | null
          secretaria?: string
        }
        Relationships: []
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
      dim_cargo: {
        Row: {
          adicionais: string[]
          ativo: boolean
          beneficios: string[]
          created_at: string
          grupo_cargo_id: string | null
          id: string
          jornada: string | null
          nivel: string | null
          nome: string
          observacoes: string | null
          requisitos: string[]
          salario_base: number | null
          salario_real_esperado: number | null
          updated_at: string
          vinculo_id: string
        }
        Insert: {
          adicionais?: string[]
          ativo?: boolean
          beneficios?: string[]
          created_at?: string
          grupo_cargo_id?: string | null
          id?: string
          jornada?: string | null
          nivel?: string | null
          nome: string
          observacoes?: string | null
          requisitos?: string[]
          salario_base?: number | null
          salario_real_esperado?: number | null
          updated_at?: string
          vinculo_id: string
        }
        Update: {
          adicionais?: string[]
          ativo?: boolean
          beneficios?: string[]
          created_at?: string
          grupo_cargo_id?: string | null
          id?: string
          jornada?: string | null
          nivel?: string | null
          nome?: string
          observacoes?: string | null
          requisitos?: string[]
          salario_base?: number | null
          salario_real_esperado?: number | null
          updated_at?: string
          vinculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_cargo_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_cargo_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "dim_cargo_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_cargo_alias: {
        Row: {
          cargo_id: string | null
          confianca: number
          created_at: string
          especialidade_id: string | null
          grupo_cargo_id: string | null
          id: string
          revisado: boolean
          texto_origem_norm: string
        }
        Insert: {
          cargo_id?: string | null
          confianca?: number
          created_at?: string
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: string
          revisado?: boolean
          texto_origem_norm: string
        }
        Update: {
          cargo_id?: string | null
          confianca?: number
          created_at?: string
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: string
          revisado?: boolean
          texto_origem_norm?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_cargo_alias_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "dim_especialidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_cargo_alias_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_cargo_alias_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      dim_especialidade: {
        Row: {
          created_at: string
          grupo_cargo_id: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          grupo_cargo_id: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          grupo_cargo_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_especialidade_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_especialidade_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      dim_grupo_cargo: {
        Row: {
          ativo: boolean
          created_at: string
          familia_funcional: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          familia_funcional?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          familia_funcional?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      dim_jornada: {
        Row: {
          horas_semanais: number | null
          id: string
          rotulo: string
        }
        Insert: {
          horas_semanais?: number | null
          id?: string
          rotulo: string
        }
        Update: {
          horas_semanais?: number | null
          id?: string
          rotulo?: string
        }
        Relationships: []
      }
      dim_motivo: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      dim_motivo_alias: {
        Row: {
          created_at: string
          id: string
          motivo_id: string | null
          revisado: boolean
          submotivo_id: string | null
          texto_origem_norm: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_id?: string | null
          revisado?: boolean
          submotivo_id?: string | null
          texto_origem_norm: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo_id?: string | null
          revisado?: boolean
          submotivo_id?: string | null
          texto_origem_norm?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_motivo_alias_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "dim_motivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_motivo_alias_submotivo_id_fkey"
            columns: ["submotivo_id"]
            isOneToOne: false
            referencedRelation: "dim_submotivo"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_secretaria: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_oficial: string
          sigla: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_oficial: string
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_oficial?: string
          sigla?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dim_secretaria_alias: {
        Row: {
          confianca: number
          created_at: string
          fonte: string | null
          id: string
          revisado: boolean
          secretaria_id: string | null
          texto_origem: string
          texto_origem_norm: string
          unidade_id: string | null
        }
        Insert: {
          confianca?: number
          created_at?: string
          fonte?: string | null
          id?: string
          revisado?: boolean
          secretaria_id?: string | null
          texto_origem: string
          texto_origem_norm: string
          unidade_id?: string | null
        }
        Update: {
          confianca?: number
          created_at?: string
          fonte?: string | null
          id?: string
          revisado?: boolean
          secretaria_id?: string | null
          texto_origem?: string
          texto_origem_norm?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dim_secretaria_alias_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_secretaria_alias_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "dim_secretaria_alias_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "dim_unidade"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_situacao_alias: {
        Row: {
          id: string
          revisado: boolean
          situacao_id: string | null
          texto_origem_norm: string
        }
        Insert: {
          id?: string
          revisado?: boolean
          situacao_id?: string | null
          texto_origem_norm: string
        }
        Update: {
          id?: string
          revisado?: boolean
          situacao_id?: string | null
          texto_origem_norm?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_situacao_alias_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "dim_situacao_chamamento"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_situacao_chamamento: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      dim_submotivo: {
        Row: {
          id: string
          motivo_id: string
          nome: string
        }
        Insert: {
          id?: string
          motivo_id: string
          nome: string
        }
        Update: {
          id?: string
          motivo_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_submotivo_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "dim_motivo"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_unidade: {
        Row: {
          created_at: string
          id: string
          nome_oficial: string
          secretaria_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_oficial: string
          secretaria_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_oficial?: string
          secretaria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_unidade_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_unidade_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
        ]
      }
      dim_vinculo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      dim_vinculo_alias: {
        Row: {
          created_at: string
          id: string
          revisado: boolean
          texto_origem_norm: string
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          revisado?: boolean
          texto_origem_norm: string
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          revisado?: boolean
          texto_origem_norm?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dim_vinculo_alias_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      evolucoes_funcionais: {
        Row: {
          cargo_atual_codigo: number | null
          cargo_atual_nome: string | null
          cargo_conciliacao: string | null
          cargo_id: string | null
          created_at: string
          data_admissao: string | null
          data_rescisao: string | null
          evolucao_cargo_codigo: number | null
          evolucao_cargo_nome: string | null
          evolucao_data: string | null
          evolucao_fundamento: string | null
          fundamento_categoria: string | null
          grupo_cargo_id: string | null
          id: number
          matricula: string
          motivo_id: string | null
          nome: string
          rescisao_codigo: number | null
          rescisao_descricao: string | null
          secretaria: string | null
          secretaria_codigo: number | null
          secretaria_id: string | null
          secretaria_nome: string | null
          sigla: string | null
          vinculo_codigo: number | null
          vinculo_id: string | null
          vinculo_nome: string | null
        }
        Insert: {
          cargo_atual_codigo?: number | null
          cargo_atual_nome?: string | null
          cargo_conciliacao?: string | null
          cargo_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_rescisao?: string | null
          evolucao_cargo_codigo?: number | null
          evolucao_cargo_nome?: string | null
          evolucao_data?: string | null
          evolucao_fundamento?: string | null
          fundamento_categoria?: string | null
          grupo_cargo_id?: string | null
          id?: number
          matricula: string
          motivo_id?: string | null
          nome: string
          rescisao_codigo?: number | null
          rescisao_descricao?: string | null
          secretaria?: string | null
          secretaria_codigo?: number | null
          secretaria_id?: string | null
          secretaria_nome?: string | null
          sigla?: string | null
          vinculo_codigo?: number | null
          vinculo_id?: string | null
          vinculo_nome?: string | null
        }
        Update: {
          cargo_atual_codigo?: number | null
          cargo_atual_nome?: string | null
          cargo_conciliacao?: string | null
          cargo_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_rescisao?: string | null
          evolucao_cargo_codigo?: number | null
          evolucao_cargo_nome?: string | null
          evolucao_data?: string | null
          evolucao_fundamento?: string | null
          fundamento_categoria?: string | null
          grupo_cargo_id?: string | null
          id?: number
          matricula?: string
          motivo_id?: string | null
          nome?: string
          rescisao_codigo?: number | null
          rescisao_descricao?: string | null
          secretaria?: string | null
          secretaria_codigo?: number | null
          secretaria_id?: string | null
          secretaria_nome?: string | null
          sigla?: string | null
          vinculo_codigo?: number | null
          vinculo_id?: string | null
          vinculo_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolucoes_funcionais_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolucoes_funcionais_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "evolucoes_funcionais_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "dim_motivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolucoes_funcionais_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolucoes_funcionais_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "evolucoes_funcionais_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      lev_auditoria: {
        Row: {
          acao: string
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
          valores_antigos: Json | null
          valores_novos: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Relationships: []
      }
      lev_certames: {
        Row: {
          ano: number | null
          arquivado: boolean
          cargo: string
          created_at: string
          data_homologacao: string | null
          desistencias_renuncias: number | null
          homologacao_status: string | null
          id: string
          importacao_id: string | null
          memo: string | null
          numero: string | null
          observacoes: string | null
          orgao: string | null
          pedidos_abertos: number | null
          pedidos_andamento: number | null
          prorrogacao: string | null
          prova_pratica: string | null
          qtd_aprovados: number | null
          qtd_atendida: number | null
          regularizar: string | null
          row_hash: string | null
          secretaria: string | null
          situacao: string | null
          tipo: string
          total_disponivel: number | null
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          ano?: number | null
          arquivado?: boolean
          cargo: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          importacao_id?: string | null
          memo?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          prova_pratica?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          regularizar?: string | null
          row_hash?: string | null
          secretaria?: string | null
          situacao?: string | null
          tipo: string
          total_disponivel?: number | null
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          ano?: number | null
          arquivado?: boolean
          cargo?: string
          created_at?: string
          data_homologacao?: string | null
          desistencias_renuncias?: number | null
          homologacao_status?: string | null
          id?: string
          importacao_id?: string | null
          memo?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao?: string | null
          pedidos_abertos?: number | null
          pedidos_andamento?: number | null
          prorrogacao?: string | null
          prova_pratica?: string | null
          qtd_aprovados?: number | null
          qtd_atendida?: number | null
          regularizar?: string | null
          row_hash?: string | null
          secretaria?: string | null
          situacao?: string | null
          tipo?: string
          total_disponivel?: number | null
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      lev_certames_historico: {
        Row: {
          certame_id: string | null
          created_at: string
          id: string
          importacao_id: string | null
          motivo: string | null
          snapshot: Json
          versao: number
        }
        Insert: {
          certame_id?: string | null
          created_at?: string
          id?: string
          importacao_id?: string | null
          motivo?: string | null
          snapshot: Json
          versao?: number
        }
        Update: {
          certame_id?: string | null
          created_at?: string
          id?: string
          importacao_id?: string | null
          motivo?: string | null
          snapshot?: Json
          versao?: number
        }
        Relationships: []
      }
      lev_importacoes: {
        Row: {
          alterados: number | null
          arquivo_nome: string
          created_at: string
          id: string
          inalterados: number | null
          novos: number | null
          removidos: number | null
          resumo: Json | null
          status: string
          uploaded_by: string | null
          versao: number
        }
        Insert: {
          alterados?: number | null
          arquivo_nome: string
          created_at?: string
          id?: string
          inalterados?: number | null
          novos?: number | null
          removidos?: number | null
          resumo?: Json | null
          status?: string
          uploaded_by?: string | null
          versao?: number
        }
        Update: {
          alterados?: number | null
          arquivo_nome?: string
          created_at?: string
          id?: string
          inalterados?: number | null
          novos?: number | null
          removidos?: number | null
          resumo?: Json | null
          status?: string
          uploaded_by?: string | null
          versao?: number
        }
        Relationships: []
      }
      lev_simulacoes: {
        Row: {
          cenario: Json
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          resultado: Json | null
          updated_at: string
        }
        Insert: {
          cenario: Json
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          resultado?: Json | null
          updated_at?: string
        }
        Update: {
          cenario?: Json
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          resultado?: Json | null
          updated_at?: string
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
      prontuarios: {
        Row: {
          ano_ingresso: number | null
          cargo: string | null
          cargo_id: string | null
          cargo_normalizado: string | null
          created_at: string
          data_inicio: string | null
          grupo_cargo_id: string | null
          id: string
          memorando: string | null
          nome: string
          nome_normalizado: string | null
          observacao: string | null
          prontuario: string
          secretaria: string | null
          secretaria_id: string | null
          sheet_origem: string | null
          telefone: string | null
          vinculo: string | null
          vinculo_id: string | null
        }
        Insert: {
          ano_ingresso?: number | null
          cargo?: string | null
          cargo_id?: string | null
          cargo_normalizado?: string | null
          created_at?: string
          data_inicio?: string | null
          grupo_cargo_id?: string | null
          id?: string
          memorando?: string | null
          nome: string
          nome_normalizado?: string | null
          observacao?: string | null
          prontuario: string
          secretaria?: string | null
          secretaria_id?: string | null
          sheet_origem?: string | null
          telefone?: string | null
          vinculo?: string | null
          vinculo_id?: string | null
        }
        Update: {
          ano_ingresso?: number | null
          cargo?: string | null
          cargo_id?: string | null
          cargo_normalizado?: string | null
          created_at?: string
          data_inicio?: string | null
          grupo_cargo_id?: string | null
          id?: string
          memorando?: string | null
          nome?: string
          nome_normalizado?: string | null
          observacao?: string | null
          prontuario?: string
          secretaria?: string | null
          secretaria_id?: string | null
          sheet_origem?: string | null
          telefone?: string | null
          vinculo?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prontuarios_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "prontuarios_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "prontuarios_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisoes: {
        Row: {
          cargo_codigo: number | null
          cargo_id: string | null
          cargo_nome: string
          created_at: string
          data_admissao: string
          data_rescisao: string
          dias_permanencia: number
          especialidade_id: string | null
          grupo_cargo_id: string | null
          id: number
          matricula: string | null
          motivo_categoria: string
          motivo_id: string | null
          nome: string
          rescisao_codigo: number
          rescisao_descricao: string
          secretaria_codigo: number | null
          secretaria_id: string | null
          secretaria_nome: string
          vinculo_categoria: string
          vinculo_id: string | null
          vinculo_nome: string
        }
        Insert: {
          cargo_codigo?: number | null
          cargo_id?: string | null
          cargo_nome: string
          created_at?: string
          data_admissao: string
          data_rescisao: string
          dias_permanencia: number
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: number
          matricula?: string | null
          motivo_categoria: string
          motivo_id?: string | null
          nome: string
          rescisao_codigo: number
          rescisao_descricao: string
          secretaria_codigo?: number | null
          secretaria_id?: string | null
          secretaria_nome: string
          vinculo_categoria: string
          vinculo_id?: string | null
          vinculo_nome: string
        }
        Update: {
          cargo_codigo?: number | null
          cargo_id?: string | null
          cargo_nome?: string
          created_at?: string
          data_admissao?: string
          data_rescisao?: string
          dias_permanencia?: number
          especialidade_id?: string | null
          grupo_cargo_id?: string | null
          id?: number
          matricula?: string | null
          motivo_categoria?: string
          motivo_id?: string | null
          nome?: string
          rescisao_codigo?: number
          rescisao_descricao?: string
          secretaria_codigo?: number | null
          secretaria_id?: string | null
          secretaria_nome?: string
          vinculo_categoria?: string
          vinculo_id?: string | null
          vinculo_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescisoes_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "dim_especialidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "dim_grupo_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_grupo_cargo_id_fkey"
            columns: ["grupo_cargo_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_grupo"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "rescisoes_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "dim_motivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "dim_secretaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "vw_kpi_por_secretaria"
            referencedColumns: ["secretaria_id"]
          },
          {
            foreignKeyName: "rescisoes_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "dim_vinculo"
            referencedColumns: ["id"]
          },
        ]
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
      vw_kpi_por_grupo: {
        Row: {
          admissoes: number | null
          chamamentos: number | null
          grupo_id: string | null
          grupo_nome: string | null
          rescisoes: number | null
          saldo: number | null
        }
        Relationships: []
      }
      vw_kpi_por_secretaria: {
        Row: {
          admissoes: number | null
          chamamentos: number | null
          rescisoes: number | null
          secretaria_id: string | null
          secretaria_nome: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _infer_grupo_cargo_id: { Args: { txt_norm: string }; Returns: string }
      _infer_secretaria_id: { Args: { txt_norm: string }; Returns: string }
      norm_txt: { Args: { s: string }; Returns: string }
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
