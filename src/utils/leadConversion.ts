import { Customer, Lead } from '../types';

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function findCustomerByPhone(customers: Customer[], lead: Lead): Customer | undefined {
  const digits = normalizePhone(lead.phone);
  if (!digits) return undefined;
  return customers.find(c => normalizePhone(c.phone) === digits);
}
