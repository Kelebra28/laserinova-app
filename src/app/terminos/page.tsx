import type { Metadata } from "next";
import LegalPage, { LegalSection, LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos del servicio | Laser Inova",
  description: "Condiciones para solicitar cotizaciones y pedidos a Laser Inova.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos del servicio">
      <p className="mt-6 text-sm leading-relaxed text-gray-700">
        Estos términos aplican a quienes solicitan cotizaciones, pedidos o información a Laser Inova por
        WhatsApp, correo u otros medios. Al contactarnos y contratar nuestros servicios, aceptas estas
        condiciones.
      </p>

      <LegalSection title="1. Servicios">
        <p>
          Ofrecemos corte y grabado láser, impresión y productos personalizados. Las características,
          materiales, medidas y acabados de cada trabajo se detallan en la cotización correspondiente.
        </p>
      </LegalSection>

      <LegalSection title="2. Cotizaciones">
        <p>
          Las cotizaciones tienen la vigencia indicada en el documento. Los precios pueden cambiar si se
          modifican el diseño, la cantidad, el material o los tiempos de entrega solicitados. Una cotización
          no garantiza disponibilidad de material hasta que se confirme el pedido.
        </p>
      </LegalSection>

      <LegalSection title="3. Pedidos, anticipos y pagos">
        <p>
          El pedido se confirma al aceptar la cotización y recibir el anticipo acordado. El saldo se liquida
          en los términos indicados en la cotización. Los pagos de materiales personalizados no son
          reembolsables una vez iniciada la producción.
        </p>
      </LegalSection>

      <LegalSection title="4. Archivos y propiedad intelectual">
        <p>
          Al enviarnos logotipos, diseños o imágenes, declaras que tienes derecho a usarlos y reproducirlos.
          Laser Inova no se hace responsable por reclamaciones de terceros sobre material que el cliente
          proporcione. No usaremos tus diseños para otros fines distintos a tu pedido sin tu autorización.
        </p>
      </LegalSection>

      <LegalSection title="5. Entregas y revisión">
        <p>
          Los tiempos de entrega son estimados y se confirman al aceptar el pedido. Te pedimos revisar el
          trabajo al recibirlo y avisarnos de cualquier inconformidad lo antes posible para poder atenderla.
        </p>
      </LegalSection>

      <LegalSection title="6. Comunicación por WhatsApp">
        <p>
          Usamos WhatsApp para atender solicitudes y dar seguimiento a tus pedidos. Podemos apoyarnos en un
          asistente automatizado para respuestas iniciales y borradores de cotización; nuestro equipo
          confirma los precios y condiciones finales. Puedes pedir en cualquier momento no recibir más
          mensajes.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitación de responsabilidad">
        <p>
          Laser Inova responde por la correcta ejecución del trabajo contratado conforme a la cotización
          aceptada. No respondemos por daños indirectos ni por retrasos causados por circunstancias fuera de
          nuestro control razonable.
        </p>
      </LegalSection>

      <LegalSection title="8. Datos personales">
        <p>
          El tratamiento de tus datos se describe en nuestro{" "}
          <a className="text-red-600 hover:underline" href="/privacidad">
            aviso de privacidad
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios y contacto">
        <p>
          Podemos actualizar estos términos; la fecha de la última actualización aparece al inicio de la
          página. Para cualquier duda escríbenos a{" "}
          <a className="text-red-600 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
