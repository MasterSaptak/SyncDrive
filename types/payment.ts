export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string; // "INR" or "₹"
  status: PaymentStatus;
  createdAt: string;
  paymentMethod: "UPI QR" | "Credit Card" | "Net Banking";
  method?: string;
  transactionRef: string;
  transactionId?: string;
  userName?: string;
  userEmail?: string;
}

export type PaymentRecord = Payment;

export interface ActivityEvent {
  id: string;
  userId: string;
  userName?: string;
  type: "upload" | "folder_create" | "subscription_activated" | "subscription_renewed" | "subscription_cancelled" | "payment" | "share" | "delete" | "login" | "admin_action";
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
