import type { Metadata } from "next";
import LegalPage, { LegalSection, LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Laser Inova",
  description: "Cómo Laser Inova recopila, usa y protege tus datos personales.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Aviso de privacidad">
      <p className="mt-6 text-sm leading-relaxed text-gray-700">
        Laser Inova es un taller de corte y grabado láser e impresión. Este aviso explica qué datos
        personales recopilamos cuando nos contactas (por ejemplo, por WhatsApp o correo), para qué los
        usamos y cómo puedes ejercer tus derechos.
      </p>

      <LegalSection title="1. Responsable">
        <p>
          Laser Inova es responsable del tratamiento de tus datos personales. Puedes escribirnos a{" "}
          <a className="text-red-600 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Nombre, empresa, teléfono y correo electrónico.</li>
          <li>Datos fiscales (por ejemplo, RFC y dirección) si solicitas factura.</li>
          <li>
            Mensajes, imágenes, audios y documentos que nos envías por WhatsApp o correo, como diseños,
            logotipos y referencias de tus proyectos.
          </li>
          <li>Información de tus cotizaciones, pedidos, anticipos y pagos.</li>
          <li>Tus respuestas a encuestas de satisfacción, si decides contestarlas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para qué usamos tus datos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Responder tus mensajes y elaborar cotizaciones.</li>
          <li>Producir, entregar y dar seguimiento a tus pedidos.</li>
          <li>Emitir comprobantes, recibos y facturas.</li>
          <li>Enviarte avisos sobre el estado de tu pedido.</li>
          <li>Mejorar nuestro servicio mediante encuestas y estadísticas internas.</li>
        </ul>
        <p>No vendemos tus datos personales ni los usamos para publicidad de terceros.</p>
      </LegalSection>

      <LegalSection title="4. WhatsApp y asistente automático">
        <p>
          Atendemos mensajes a través de la plataforma WhatsApp Business de Meta. Al escribirnos, Meta
          procesa tus mensajes según sus propias políticas. Podemos usar un asistente automatizado con
          inteligencia artificial para responder preguntas frecuentes y preparar cotizaciones. El equipo
          de Laser Inova puede revisar y continuar cualquier conversación. Si prefieres hablar con una
          persona, indícalo en el chat.
        </p>
      </LegalSection>

      <LegalSection title="5. Con quién compartimos tus datos">
        <p>
          Solo con proveedores que nos ayudan a operar el servicio (alojamiento, mensajería, correo y
          herramientas de inteligencia artificial) y con autoridades cuando la ley lo exija. Estos
          proveedores tratan los datos únicamente para prestarnos su servicio.
        </p>
      </LegalSection>

      <LegalSection title="6. Conservación y seguridad">
        <p>
          Conservamos tus datos el tiempo necesario para atender tus pedidos y cumplir obligaciones
          legales y fiscales. Protegemos la información con acceso restringido por usuario, conexiones
          cifradas y copias de seguridad.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos y eliminación de datos">
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición al uso de tus datos, o pedir que
          eliminemos tu información, incluidas tus conversaciones de WhatsApp. Escríbenos a{" "}
          <a className="text-red-600 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          indicando tu nombre y el número de teléfono con el que nos contactaste. Atenderemos tu solicitud
          en un plazo máximo de 20 días hábiles y te confirmaremos cuando esté completada. Algunos datos
          fiscales pueden conservarse el tiempo que la ley exija.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios a este aviso">
        <p>
          Podemos actualizar este aviso. La fecha de la última actualización aparece al inicio de esta
          página.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
