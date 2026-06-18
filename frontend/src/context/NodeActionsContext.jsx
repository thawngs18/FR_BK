import { createContext, useContext } from 'react';

export const NodeActionsContext = createContext(null);

export function useNodeActions() {
  return useContext(NodeActionsContext);
}
