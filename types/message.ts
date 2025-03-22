export interface Message {
  text: string;
  file?: {
    name: string;
    url: string;
    type: string;
  };
  isUser: boolean;
  timestamp: Date;
} 