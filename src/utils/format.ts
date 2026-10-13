// Brazilian formatting utilities

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskDate(value: string): string {
  let digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

export function isValidEmail(email: string): boolean {
  if (!email) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateSaleNumber(sales: { number: string }[]): string {
  const maxNum = sales.reduce((max, s) => {
    const n = parseInt(s.number.replace('V', ''));
    return n > max ? n : max;
  }, 0);
  return `V${String(maxNum + 1).padStart(5, '0')}`;
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = getTodayStr();
  return dateStr < today;
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayStr();
}

export const ORIGIN_LABELS: Record<string, string> = {
  google: 'Google',
  instagram: 'Instagram',
  indication: 'Indicação',
  store: 'Loja física',
  whatsapp: 'WhatsApp',
  other: 'Outro',
  unknown: 'Não informado',
};

export const STAGE_LABELS: Record<string, string> = {
  new_contact: 'Novo contato',
  in_service: 'Em atendimento',
  quote_sent: 'Orçamento enviado',
  awaiting_return: 'Aguardando retorno',
  won: 'Venda concluída',
  lost: 'Perdido',
};

export const STAGE_COLORS: Record<string, string> = {
  new_contact: 'bg-blue-100 text-blue-800',
  in_service: 'bg-yellow-100 text-yellow-800',
  quote_sent: 'bg-purple-100 text-purple-800',
  awaiting_return: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

export const FOLLOW_UP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  scheduled: 'Agendado',
  sent: 'Enviado',
  responded: 'Respondido',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  failed: 'Falha',
};

export const FOLLOW_UP_REASON_LABELS: Record<string, string> = {
  post_purchase: 'Pós-compra',
  satisfaction: 'Verificação de satisfação',
  prescription_review: 'Revisão de receita',
  maintenance: 'Manutenção/Cuidados',
  inactive_client: 'Cliente inativo',
  pending_quote: 'Orçamento pendente',
  other: 'Outro',
};

export const CATEGORY_LABELS: Record<string, string> = {
  frames: 'Armações',
  lenses: 'Lentes',
  sunglasses: 'Óculos de sol',
  accessories: 'Acessórios',
  services: 'Serviços',
  other: 'Outros',
};

export const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  installment: 'Parcelado',
  other: 'Outro',
};

export const SALE_STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  refunded: 'Estornada',
};

export const LOSS_REASON_LABELS: Record<string, string> = {
  price: 'Preço',
  competitor: 'Concorrente',
  no_need: 'Sem necessidade',
  no_response: 'Sem resposta',
  other: 'Outro',
};
