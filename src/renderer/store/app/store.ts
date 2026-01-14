import { create } from 'zustand';
import { createUISlice, type UISlice } from './slices';

export type AppStore = UISlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createUISlice(...a),
}));
