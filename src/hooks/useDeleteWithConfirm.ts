import { useState } from 'react';
import { Alert } from 'react-native';

interface UseDeleteWithConfirmResult {
  confirmDelete: () => void;
  isDeleting: boolean;
}

export const useDeleteWithConfirm = (
  deleteFn: () => Promise<void>,
  options: {
    title?: string;
    message: string;
    onSuccess?: () => void;
    successMessage?: string;
    errorMessage?: string;
  }
): UseDeleteWithConfirmResult => {
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      options.title || 'Confirmar eliminación',
      options.message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteFn();
              if (options.successMessage) {
                Alert.alert('Éxito', options.successMessage);
              }
              if (options.onSuccess) {
                options.onSuccess();
              }
            } catch (error) {
              Alert.alert(
                'Error',
                options.errorMessage || 'No se pudo completar la operación'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return { confirmDelete, isDeleting };
};
