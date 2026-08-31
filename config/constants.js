// Shared constants and configuration
// Centralizes values used across multiple pages to avoid duplication

/**
 * Color palette used for charts and UI elements
 */
const PALETTE = ["#174e3a", "#cda348", "#236a50", "#a33b32", "#68736d", "#8a6517", "#4f7d68", "#d9b877", "#3c5c4e", "#b98f3e"];

/**
 * Risk level labels
 */
const RISK_LABELS = {
  R1: "Risco I",
  R2: "Risco II",
  R3: "Risco III"
};

/**
 * Chatbot stage order and labels (used in analytics.html)
 */
const CHAT_STAGE_ORDER = ["risk", "estabelecimento", "instalacoes", "processo"];
const STAGE_LABELS = {
  risk: "Risco",
  estabelecimento: "Estabelecimento",
  instalacoes: "Instalações",
  processo: "Processo",
  null: "Não iniciou (sem nome)"
};

/**
 * Lead status labels (used in analytics2.html)
 */
const STATUS_LABELS = {
  novo: "Novo",
  contatado: "Contatado",
  em_negociacao: "Em negociação",
  fechado: "Fechado",
  perdido: "Perdido"
};

/**
 * Default chart configuration options
 */
const CHART_DEFAULTS = {
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
};

// Export for use in other modules (if using ES6 modules)
// For now, we'll attach to window for global access in non-module scripts
if (typeof window !== 'undefined') {
  window.CONFIG = {
    PALETTE,
    RISK_LABELS,
    CHAT_STAGE_ORDER,
    STAGE_LABELS,
    STATUS_LABELS,
    CHART_DEFAULTS
  };
}