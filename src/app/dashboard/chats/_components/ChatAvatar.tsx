import { Avatar } from '@/components/ui/Avatar';

type AvatarContact = { name?: string | null; phone?: string | null; profilePictureUrl?: string | null };

/** Avatar de un contacto de WhatsApp: su foto de perfil o la inicial de su nombre, en círculo. */
export function ChatAvatar({ contact, size }: { contact: AvatarContact; size: number }) {
  return (
    <Avatar
      name={contact.name}
      seed={contact.phone}
      imageUrl={contact.profilePictureUrl}
      size={size}
      shape="circle"
      maxInitials={1}
      title=""
      variant="soft"
    />
  );
}
