export interface SupportTicket {
  id: number;
  idcommerce: number;
  customer_name: string;
  customer_email: string;
  customer_id: number | null;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}