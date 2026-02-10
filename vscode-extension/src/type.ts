export interface IResponse<T extends Record<string, any>> {
  success: boolean;
  data?: T;
  error?: string;
}
