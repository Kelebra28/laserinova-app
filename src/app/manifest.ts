import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CRM Laser Inova',
    short_name: 'Laser Inova',
    description: 'Sistema interno de cotizaciones y administración',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#09090b', // Oscuro para que coincida con el menú superior
    orientation: 'portrait',
    icons: [
      {
        src: '/logo_sidebar.png',
        sizes: 'any',
        type: 'image/png',
      }
    ],
  };
}
