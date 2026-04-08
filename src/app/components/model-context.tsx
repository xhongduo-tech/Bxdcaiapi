import { createContext, useContext, useState, type ReactNode } from "react";
import { models as initialModels, notifications as initialNotifications, type Model, type NotificationItem } from "./model-data";

interface ModelContextType {
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
}

const ModelContext = createContext<ModelContextType>({
  models: initialModels,
  setModels: () => {},
  notifications: initialNotifications,
  setNotifications: () => {},
});

export function ModelProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([...initialModels]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([...initialNotifications]);
  return (
    <ModelContext.Provider value={{ models, setModels, notifications, setNotifications }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModels() {
  return useContext(ModelContext);
}
