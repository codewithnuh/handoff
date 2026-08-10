export type ActionSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ActionError = {
  success: false;
  message: string;
  error: {
    code: string;
    fieldErrors?: Record<string, string[]>;
  };
};

export type ActionResponse<T> = ActionError | ActionSuccess<T>;
