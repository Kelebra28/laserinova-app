import { notFound } from "next/navigation";
import EditQuoteForm from "@/components/quotes/EditQuoteForm";
import QuoteVersionTabs from "@/components/quotes/QuoteVersionTabs";
import { getQuoteEditDataService, getActiveClientsService } from "@/server/services/quote.service";

export default async function EditQuotePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const quoteId = params.id;

  const data = await getQuoteEditDataService(quoteId);

  if (!data || !data.quote) {
    notFound();
  }

  const { quote, versions, materials, products, safeGlobals } = data;
  const clients = await getActiveClientsService();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cotización <span className="text-red-600">{quote.folio}</span></h1>
      </div>
      
      <QuoteVersionTabs 
        versions={versions} 
        currentQuoteId={quote.id} 
        versionGroupId={quote.versionGroupId} 
      />

      <EditQuoteForm 
        quote={quote} 
        clients={clients} 
        materials={materials} 
        products={products}
        globalCosts={safeGlobals} 
      />
    </div>
  );
}
