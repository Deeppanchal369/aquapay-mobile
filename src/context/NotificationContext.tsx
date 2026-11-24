import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchUsers, UserItem } from "../api/users";
import { useAuth } from "./AuthContext";

export type NotificationType = "user" | "kyc" | "transaction" | "system" | "warning";

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
  actionRoute?: string;
  data?: any;
}

export interface NotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  actionRoute?: string;
  data?: any;
  autoDismissMs?: number;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  activeNotification: InAppNotification | null;
  unreadCount: number;
  showNotification: (input: NotificationInput) => void;
  dismissNotification: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  simulateLiveEvent: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  activeNotification: null,
  unreadCount: 0,
  showNotification: () => {},
  dismissNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
  simulateLiveEvent: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// Initial baseline activities so the notification center feels rich and informative
const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: "notif-init-1",
    title: "System Ready",
    message: "AquaPay Admin Portal connected and monitoring user activities.",
    type: "system",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    read: true,
  },
  {
    id: "notif-init-2",
    title: "KYC Queue Updated",
    message: "8 verified accounts passed DigiLocker audit checks.",
    type: "kyc",
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    read: true,
    actionRoute: "/(admin)/kyc",
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownUserIdsRef = useRef<Set<number>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Auto-dismiss helper
  const dismissNotification = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setActiveNotification(null);
  }, []);

  const showNotification = useCallback(
    ({
      title,
      message,
      type = "system",
      actionRoute,
      data,
      autoDismissMs = 4500,
    }: NotificationInput) => {
      const newNotification: InAppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title,
        message,
        type,
        timestamp: new Date(),
        read: false,
        actionRoute,
        data,
      };

      // Add to front of notifications list
      setNotifications((prev) => [newNotification, ...prev.slice(0, 39)]); // keep up to 40
      setActiveNotification(newNotification);

      // Reset auto-dismiss timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        dismissNotification();
      }, autoDismissMs);
    },
    [dismissNotification]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    dismissNotification();
  }, [dismissNotification]);

  // Real-time Polling: Check for newly created users or KYC updates when Admin is active
  useEffect(() => {
    const isAdmin = user && (user.role === "admin" || user.role_id === 1);
    if (!isAdmin) return;

    let isMounted = true;

    const checkNewUsers = async () => {
      try {
        const users: UserItem[] = await fetchUsers();
        if (!isMounted || !Array.isArray(users)) return;

        // First initial run: snapshot current IDs
        if (!initialLoadDoneRef.current) {
          users.forEach((u) => knownUserIdsRef.current.add(u.id));
          initialLoadDoneRef.current = true;
          return;
        }

        // Check for any newly added user
        const newUsers = users.filter((u) => !knownUserIdsRef.current.has(u.id));
        if (newUsers.length > 0) {
          newUsers.forEach((newUser) => {
            knownUserIdsRef.current.add(newUser.id);
            showNotification({
              title: "New Member Registered",
              message: `${newUser.name} registered as ${newUser.role_name || "User"} (${newUser.mobile})`,
              type: "user",
              actionRoute: "/(admin)/users",
              data: newUser,
            });
          });
        }
      } catch {
        // Quiet fallback to preserve performance
      }
    };

    // Run first snapshot immediately
    checkNewUsers();

    // Check periodically every 15 seconds
    const interval = setInterval(checkNewUsers, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, showNotification]);

  // Realistic Simulation Generator for Testing & Demo
  const simulateLiveEvent = useCallback(() => {
    const simulationPool: NotificationInput[] = [
      {
        title: "New Retailer Onboarded",
        message: "Suresh Patil added as Retailer under State Head Maharashtra.",
        type: "user",
        actionRoute: "/(admin)/users",
      },
      {
        title: "DigiLocker KYC Submitted",
        message: "Merchant Priya Electronics uploaded Aadhaar & PAN for audit.",
        type: "kyc",
        actionRoute: "/(admin)/kyc",
      },
      {
        title: "Penny Drop Verification",
        message: "Bank account validation succeeded for Distributor Vikas.",
        type: "transaction",
        actionRoute: "/(admin)/kyc",
      },
      {
        title: "Distributor Activity",
        message: "Distributor Rajesh added 3 new retail endpoints in Pune cluster.",
        type: "user",
        actionRoute: "/(admin)/users",
      },
      {
        title: "Compliance Pass",
        message: "Periodic Aadhaar OTP verification passed for NSM Amit.",
        type: "kyc",
        actionRoute: "/(admin)/kyc",
      },
    ];

    const randomIndex = Math.floor(Math.random() * simulationPool.length);
    showNotification(simulationPool[randomIndex]);
  }, [showNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        activeNotification,
        unreadCount,
        showNotification,
        dismissNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        simulateLiveEvent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
