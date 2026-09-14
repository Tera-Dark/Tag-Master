import { createContext, useContext } from 'react';

export interface DialogActions {
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
  alert: (message: string) => Promise<void>;
}
export const DialogContext = createContext<DialogActions | null>(null);
export const useDialogs = () => {
  const dialogs = useContext(DialogContext);
  if (!dialogs) throw new Error('DialogProvider is required');
  return dialogs;
};
