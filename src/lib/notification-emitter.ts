import { pusherServer } from './pusher';

export const notificationEmitter = {
  // Devuelve la promesa: en Vercel hay que hacer await, si no la función se congela antes de que Pusher reciba el evento.
  emit: (event: string, data: any) => {
    // Disparamos el evento a través de Pusher en el canal global "crm-channel"
    // Esto asegura que todos los navegadores conectados (independientemente del proceso/servidor) lo reciban.
    return pusherServer.trigger('crm-channel', event, data).catch((error) => {
      console.error('Error al emitir evento de Pusher:', error);
    });
  }
};
