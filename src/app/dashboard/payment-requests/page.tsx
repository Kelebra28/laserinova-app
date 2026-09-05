import { Metadata } from "next";
import PaymentRequestsClient from "@/components/payments/PaymentRequestsClient";

export const metadata: Metadata = {
  title: "Solicitudes de Pago | CRM Laser Inova",
};

export default function PaymentRequestsPage() {
  return (
    <div className="py-6 sm:py-8 lg:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <PaymentRequestsClient />
    </div>
  );
}
